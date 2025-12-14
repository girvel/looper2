package looper2

import (
	"log"
	"math/rand/v2"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (d Deps) getTasks(c *gin.Context) {
	rows, err := d.DB.Query("SELECT id, text FROM tasks")
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer rows.Close()

	tasks := make([]gin.H, 0)
	for rows.Next() {
		var id int
		var text string
		
		if err := rows.Scan(&id, &text); err != nil {
			log.Println(err);
			c.JSON(http.StatusInternalServerError, gin.H{})
			return
		}

		tasks = append(tasks, gin.H{"id": id, "text": text})
	}
	
	c.JSON(http.StatusOK, tasks)
}

type task struct {
	Text string `json:"text"`
}

func (d Deps) addTask(c *gin.Context) {
	var currentTask task
	if err := c.BindJSON(&currentTask); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	result, err := d.DB.Exec("INSERT INTO tasks (text) VALUES (?)", currentTask.Text)
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK", "id": id})
}

func (d Deps) completeTask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	if _, err := d.DB.Exec("DELETE FROM tasks WHERE id = ?", id); err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

func (d Deps) getTags(c *gin.Context) {
	rows, err := d.DB.Query(`
		SELECT tags.name, subtags.name FROM tags
		LEFT JOIN subtags ON tags.id = subtags.tag_id
	`)
	if err != nil {
		log.Println(err)
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer rows.Close()

	tagMap := make(map[string][]string)
	for rows.Next() {
		var name string
		var subtag *string
		if err := rows.Scan(&name, &subtag); err != nil {
			log.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{})
			return
		}

		if subtag != nil {
			tagMap[name] = append(tagMap[name], *subtag)
		} else {
			tagMap[name] = make([]string, 0)
		}
	}

	result := make([]gin.H, 0, len(tagMap))
	for k, v := range tagMap {
		result = append(result, gin.H{"name": k, "subtags": v})
	}

	c.JSON(http.StatusOK, result)
}

type tag struct {
	Name string `json:"name"`
	Subtags []string `json:"subtags"`
}

func (d Deps) addTag(c *gin.Context) {
	var currentTag tag
	if err := c.BindJSON(&currentTag); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	tx, err := d.DB.Begin()
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
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
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	_, err = tx.Exec("DELETE FROM subtags WHERE tag_id = ?", tagId)
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	statement, err := tx.Prepare("INSERT INTO subtags (tag_id, name) VALUES (?, ?)")
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}
	defer statement.Close()

	for _, subtag := range currentTag.Subtags {
		if _, err := statement.Exec(tagId, subtag); err != nil {
			log.Println(err);
			c.JSON(http.StatusInternalServerError, gin.H{})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

type tagName struct {
	Name string `json:"name"`
}

func (d Deps) removeTag(c *gin.Context) {
	var currentTag tagName
	if err := c.BindJSON(&currentTag); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	_, err := d.DB.Exec("DELETE FROM tags WHERE name = ?", currentTag.Name);
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

func (d Deps) healthCheck(c *gin.Context) {
	if err := d.DB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DB_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "OK"})
}

var idioms []string = []string{
	"Clean the staples",
	"Advance alchemic knowledge",
	"Journal tribe movements",
	"Wash my pants",
	"Buy ritual paint (3), rags (3)",
	"Pratice swordcraft",
	"Clean the dungeon",
	"Send anonymous prank letters to the King",
	"Hunt",
	"Change oil in lamps",
	"Sell toenails",
	"Fight hornets",
	"Buy sausages (1000 lb)",
	"Feed the platypus bear",
}

func (d Deps) index(c *gin.Context) {
	c.HTML(http.StatusOK, "index.tmpl", gin.H{
		"Config": d.Config,
		"Idiom": idioms[rand.IntN(len(idioms))],
	})
}

func ApiRoutes(router *gin.Engine, deps *Deps) {
	router.GET("/api/tasks", deps.getTasks)
	router.POST("/api/tasks", deps.addTask)
	router.POST("/api/tasks/:id", deps.completeTask)

	router.GET("/api/tags", deps.getTags)
	router.POST("/api/tags", deps.addTag)
	router.POST("/api/tags/remove", deps.removeTag)

	router.GET("/api/healthcheck", deps.healthCheck)

	router.LoadHTMLGlob("templates/*")
	router.Static("/static", "./static")
	router.GET("/", deps.index)
}

