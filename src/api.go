package looper2

import (
	"log"
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
	var current_task task
	if err := c.BindJSON(&current_task); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	result, err := d.DB.Exec("INSERT INTO tasks (text) VALUES (?)", current_task.Text)
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

func (d Deps) index(c *gin.Context) {
	c.HTML(http.StatusOK, "index.tmpl", gin.H{"Config": d.Config})
}

func ApiRoutes(router *gin.Engine, deps *Deps) {
	router.GET("/api/tasks", deps.getTasks)
	router.POST("/api/tasks", deps.addTask)
	router.POST("/api/tasks/:id", deps.completeTask)

	router.LoadHTMLGlob("templates/*")
	router.Static("/static", "./static")
	router.GET("/", deps.index)
}

