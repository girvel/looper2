package main

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

type Deps struct {
	*sql.DB
}

func NewDeps() (*Deps, error) {
	db, err := sql.Open("sqlite3", "looper2.db")
	if err != nil {
		return nil, err
	}
	// TODO close DB

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			text TEXT
		);
	`)
	if err != nil {
		return nil, err
	}

	log.Println("Established sqlite3 DB")
	return &Deps{db}, nil
}

func (d Deps) GetTasks(c *gin.Context) {
	rows, err := d.DB.Query("SELECT id, text FROM tasks")
	if err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

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

type Task struct {
	Text string `json:"text"`
}

func (d Deps) AddTask(c *gin.Context) {
	var task Task
	if err := c.BindJSON(&task); err != nil {
		log.Println(err);
		c.JSON(http.StatusInternalServerError, gin.H{})
		return
	}

	result, err := d.DB.Exec("INSERT INTO tasks (text) VALUES (?)", task.Text)
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

func (d Deps) CompleteTask(c *gin.Context) {
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

func Index(c *gin.Context) {
	c.HTML(http.StatusOK, "index.tmpl", gin.H{})
}

func run() error {
	deps, err := NewDeps()
	if err != nil {
		return err
	}

	router := gin.Default()
	router.GET("/api/tasks", deps.GetTasks)
	router.POST("/api/tasks", deps.AddTask)
	router.POST("/api/tasks/:id", deps.CompleteTask)

	router.LoadHTMLGlob("templates/*")
	router.Static("/static", "./static")
	router.GET("/", Index)

	router.Run()
	
	return nil
}

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}
