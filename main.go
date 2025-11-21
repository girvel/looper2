package main

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
	// "github.com/gin-gonic/gin"
)

// type context struct {
// 	*sql.DB
// }

func run() error {
	db, err := sql.Open("sqlite3", "looper2.db")
	if err != nil {
		return err
	}
	defer db.Close()
	log.Println("Connected.")

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			text TEXT
		);
	`)
	if err != nil {
		return err
	}
	log.Println("Initialized table tasks")

	_, err = db.Exec("INSERT INTO tasks(text) VALUES (?)", "An entry")
	if err != nil {
		return err
	}
	log.Println("Inserted an entry")

	rows, err := db.Query("SELECT id, text FROM tasks")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		var text string
		err = rows.Scan(&id, &text)
		if err != nil {
			return err
		}
		log.Printf("ID: %d, Name: %s", id, text)
	}
	
	return nil
}

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}
