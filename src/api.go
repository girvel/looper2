package looper2

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

	result, err := d.DB.Exec(`
		INSERT INTO tasks (user, text) VALUES (?, ?)
	`, c.GetString("user"), currentTask.Text)
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

	_, err = d.DB.Exec(`
		UPDATE tasks SET completion_time = ? WHERE id = ? AND user = ?
	`, time.Now().Unix(), id, c.GetString("user"))
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

	_, err = d.DB.Exec(`
		UPDATE tasks SET text = ? WHERE id = ? AND user = ?
	`, currentTask.Text, id, c.GetString("user"))
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
		WHERE tags.user = ?
	`, c.GetString("user"))
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
		INSERT INTO tags (user, name) VALUES (?, ?)
		ON CONFLICT (user, name) DO UPDATE SET name = excluded.name
		RETURNING id
	`, c.GetString("user"), currentTag.Name).Scan(&tagId)
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

	_, err := d.DB.Exec(`
		DELETE FROM tags WHERE name = ? AND user = ?
	`, currentTag.Name, c.GetString("user"));
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
	Login string `json:"login" binding:"required"`
	Password string `json:"password" binding:"required"`
}

const authLifetime int = 3600 * 24 * 30

func (d Deps) auth(c *gin.Context) error {
	var pair authPair
	if err := c.BindJSON(&pair); err != nil {
		return err
	}

	var password_hashed string
	err := d.DB.QueryRowContext(c.Request.Context(), `
		SELECT password_hashed FROM users
		WHERE user = ?
	`, pair.Login).Scan(&password_hashed)
	if err != nil {
		log.Printf("Wrong user")
		c.JSON(http.StatusConflict, gin.H{"status": "BAD"})
		return nil
	}

	err = bcrypt.CompareHashAndPassword([]byte(password_hashed), []byte(pair.Password))
	if err != nil {
		log.Printf("Wrong password")
		c.JSON(http.StatusConflict, gin.H{"status": "BAD"})
		return nil
	}

	token, err := IssueToken(pair.Login, int64(authLifetime), d.Config.AuthKey)
	if err != nil {
		return err
	}

	c.SetCookie("access_token", token, authLifetime, "/", "", d.Config.ReleaseMode, true)
	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

func (d Deps) register(c *gin.Context) error {
	var pair authPair
	if err := c.BindJSON(&pair); err != nil {
		return err
	}

	password_hashed, err := bcrypt.GenerateFromPassword([]byte(pair.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	d.DB.Exec(`
		INSERT INTO users (user, password_hashed)
		VALUES (?, ?)
	`, pair.Login, string(password_hashed))

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
	return nil
}

func (d Deps) authRequired(c *gin.Context) error {
	token, err := c.Cookie("access_token")
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return nil
	}

	sub, err := ValidateToken(token, d.Config.AuthKey)
	if err != nil {
		c.SetCookie("access_token", "", -1, "/", "", d.Config.ReleaseMode, true)
		c.Abort()
		return err
	}

	c.Set("user", sub)
	c.Next()
	return nil
}

func ApiRoutes(router *gin.Engine, deps *Deps) {
	{
		tasks := router.Group("/api/tasks")
		tasks.Use(wrap(deps.authRequired))

		tasks.GET("/", wrap(deps.getTasks))
		tasks.POST("/", wrap(deps.addTask))
		tasks.POST("/:id/complete", wrap(deps.completeTask))
		tasks.POST("/:id/rename", wrap(deps.renameTask))
	}

	{
		tags := router.Group("/api/tags")
		tags.Use(wrap(deps.authRequired))

		tags.GET("/", wrap(deps.getTags))
		tags.POST("/", wrap(deps.setTag))
		tags.POST("/remove", wrap(deps.removeTag))
	}

	router.POST("/api/auth", wrap(deps.auth))
	router.POST("/api/auth/register", wrap(deps.register))

	router.GET("/api/healthcheck", deps.healthCheck)
}

