package looper2

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type HandlerFunc func(c *gin.Context) error

func wrap(fn HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := fn(c); err != nil {
			log.Printf("Internal error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"status": "ERROR"})
		}
	}
}

// Only GET queries use context: POST query should still execute, even if connection breaks

type task struct {
	Id int `json:"id"`
	Text string `json:"text"`
	CompletionTime *int `json:"completion_time"`
}

func (d Deps) getTasks(c *gin.Context) error {
	rows, err := d.DB.QueryContext(c.Request.Context(), `
		SELECT id, text, completion_time FROM tasks WHERE user = ?
	`, c.GetString("user"))

	if err != nil {
		return err
	}
	defer rows.Close()

	tasks := make([]task, 0)
	for rows.Next() {
		var currentTask task
		
		err := rows.Scan(&currentTask.Id, &currentTask.Text, &currentTask.CompletionTime)
		if err != nil {
			return err
		}

		tasks = append(tasks, currentTask)
	}
	
	c.JSON(http.StatusOK, tasks)
	return nil
}

type taskText struct {
	Text string `json:"text"`
}

func (d Deps) addTask(c *gin.Context) error {
	var currentTask taskText
	if err := c.BindJSON(&currentTask); err != nil {
		return err
	}

	result, err := d.DB.Exec("INSERT INTO tasks (text) VALUES (?)", currentTask.Text)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK", "id": id})
	return nil
}

func (d Deps) completeTask(c *gin.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}

	_, err = d.DB.Exec("UPDATE tasks SET completion_time = ? WHERE id = ?", time.Now().Unix(), id)
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

func (d Deps) renameTask(c *gin.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return err
	}

	var currentTask taskText
	if err := c.BindJSON(&currentTask); err != nil {
		return err
	}

	_, err = d.DB.Exec("UPDATE tasks SET text = ? WHERE id = ?", currentTask.Text, id)
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

type tag struct {
	Name string `json:"name"`
	Subtags []string `json:"subtags"`
}

func (d Deps) getTags(c *gin.Context) error {
	rows, err := d.DB.QueryContext(c.Request.Context(), `
		SELECT tags.name, subtags.name FROM tags
		LEFT JOIN subtags ON tags.id = subtags.tag_id
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	tagMap := make(map[string][]string)
	for rows.Next() {
		var name string
		var subtag *string
		if err := rows.Scan(&name, &subtag); err != nil {
			return err
		}

		if subtag != nil {
			tagMap[name] = append(tagMap[name], *subtag)
		} else {
			tagMap[name] = make([]string, 0)
		}
	}

	keys := make([]string, 0, len(tagMap))
	for k := range tagMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	result := make([]tag, 0, len(tagMap))
	for _, k := range keys {
		result = append(result, tag{Name: k, Subtags: tagMap[k]})
	}

	c.JSON(http.StatusOK, result)
	return nil
}

func (d Deps) setTag(c *gin.Context) error {
	var currentTag tag
	if err := c.BindJSON(&currentTag); err != nil {
		return err
	}

	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tagId int
	// dummy DO UPDATE SET to return a value
	err = tx.QueryRow(`
		INSERT INTO tags (name) VALUES (?)
		ON CONFLICT (name) DO UPDATE SET name = excluded.name
		RETURNING id
	`, currentTag.Name).Scan(&tagId)
	if err != nil {
		return err
	}

	// TODO unsafe, recreates subtags
	_, err = tx.Exec("DELETE FROM subtags WHERE tag_id = ?", tagId)
	if err != nil {
		return err
	}

	statement, err := tx.Prepare("INSERT INTO subtags (tag_id, name) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer statement.Close()

	for _, subtag := range currentTag.Subtags {
		if _, err := statement.Exec(tagId, subtag); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

type tagName struct {
	Name string `json:"name"`
}

func (d Deps) removeTag(c *gin.Context) error {
	var currentTag tagName
	if err := c.BindJSON(&currentTag); err != nil {
		return err
	}

	_, err := d.DB.Exec("DELETE FROM tags WHERE name = ?", currentTag.Name);
	if err != nil {
		return err
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

func (d Deps) healthCheck(c *gin.Context) {
	if err := d.DB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DB_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

type authPair struct {
	Login string `json:"login"`
	Password string `json:"password"`
}

const authLifetime int = 3600 * 24 * 30
var authKey []byte = []byte("TEMP-KEY-TODO-REPLACE")

func (d Deps) auth(c *gin.Context) error {
	now := time.Now().Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "looper2",
		"sub": "girvel",
		"exp": now + int64(authLifetime),
		"iat": now,
	})

	token_str, err := token.SignedString(authKey)
	if err != nil {
		return err
	}

	c.SetCookie("access_token", token_str, authLifetime, "/", "", d.Stats.ReleaseMode, true)
	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

func (d Deps) authRequired(c *gin.Context) error {
	token_str, err := c.Cookie("access_token")
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return nil
	}

	token, err := jwt.Parse(
		token_str,
		func(token *jwt.Token) (any, error) { return authKey, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(),
	)
	if err != nil {
		return err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return fmt.Errorf("Unable to cast claims")
	}

	c.Set("user", claims["sub"])
	c.Next()
	return nil
}

func ApiRoutes(router *gin.Engine, deps *Deps) {
	router.GET("/api/tasks", wrap(deps.authRequired), wrap(deps.getTasks))
	router.POST("/api/tasks", wrap(deps.addTask))
	router.POST("/api/tasks/:id/complete", wrap(deps.completeTask))
	router.POST("/api/tasks/:id/rename", wrap(deps.renameTask))

	router.GET("/api/tags", wrap(deps.getTags))
	router.POST("/api/tags", wrap(deps.setTag))
	router.POST("/api/tags/remove", wrap(deps.removeTag))

	router.POST("/api/auth", wrap(deps.auth))

	router.GET("/api/healthcheck", deps.healthCheck)
}

