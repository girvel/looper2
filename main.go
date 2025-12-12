package main

import (
	"database/sql"
	"log"
	"net/http"

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

	var tasks []gin.H
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

func run() error {
	deps, err := NewDeps()
	if err != nil {
		return err
	}

	router := gin.Default()
	router.GET("/api/tasks", deps.GetTasks)

	router.Run()

	// _, err = db.Exec("INSERT INTO tasks(text) VALUES (?)", "An entry")
	// if err != nil {
	// 	return err
	// }
	// log.Println("Inserted an entry")

	// rows, err := db.Query("SELECT id, text FROM tasks")
	// if err != nil {
	// 	return err
	// }
	// for rows.Next() {
	// 	var id int
	// 	var text string
	// 	err = rows.Scan(&id, &text)
	// 	if err != nil {
	// 		return err
	// 	}
	// 	log.Printf("ID: %d, Name: %s", id, text)
	// }
	
	return nil
}

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}
