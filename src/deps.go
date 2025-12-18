package looper2

import (
	"database/sql"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type Stats struct {
	StaticPrefix string
	ReleaseMode bool
}

type Deps struct {
	*sql.DB
	Stats
}

func NewDeps() (*Deps, error) {
	if err := os.MkdirAll("data", os.ModePerm); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite3", "data/looper2.db?_busy_timeout=1000&_foreign_keys=on")
	if err != nil {
		return nil, err
	}

	if _, err = db.Exec(`
		PRAGMA journal_mode = WAL;

		CREATE TABLE IF NOT EXISTS users (
			user TEXT NOT NULL PRIMARY KEY,
			password_hashed TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS tasks (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			user TEXT NOT NULL,
			text TEXT NOT NULL,
			completion_time INTEGER,

			FOREIGN KEY(user) REFERENCES users(user)
		);

		CREATE TABLE IF NOT EXISTS tags (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			user TEXT NOT NULL,
			name TEXT NOT NULL,

			FOREIGN KEY(user) REFERENCES users(user),
			UNIQUE(user, name)
		);

		CREATE TABLE IF NOT EXISTS subtags (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
			tag_id INTEGER NOT NULL,
			name TEXT NOT NULL,

			FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
			UNIQUE(tag_id, name)
		);
	`); err != nil {
		return nil, err
	}

	log.Println("Established sqlite3 DB")

	var stats Stats
	stats.ReleaseMode = gin.Mode() == gin.ReleaseMode
	if stats.ReleaseMode {
		stats.StaticPrefix = "/static/" + strconv.FormatInt(time.Now().Unix(), 10)
	} else {
		stats.StaticPrefix = "/static/dev"
	}

	return &Deps{
		DB: db,
		Stats: stats,
	}, nil
}

func (d *Deps) Close() {
	d.DB.Close()
}

