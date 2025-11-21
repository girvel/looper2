package main

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	db, err := sql.Open("sqlite3", "test.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			text TEXT
		);
	`)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Initialized table tasks")

	_, err = db.Exec("INSERT INTO tasks(text) VALUES (?)", "An entry")
	if err != nil {
		log.Fatal(err)
	}
	log.Println("Inserted an entry")

	rows, err := db.Query("SELECT id, text FROM tasks")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var id int
		var text string
		err = rows.Scan(&id, &text)
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("ID: %d, Name: %s", id, text)
	}

	log.Println("Connected.")
}
