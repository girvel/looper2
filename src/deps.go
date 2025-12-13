package looper2

import (
	"database/sql"
	"log"
	"os"
	"time"
)

type Config struct {
	ReleaseMode bool
	StartupTime int64
}

type Deps struct {
	*sql.DB
	Config
}

func NewDeps() (*Deps, error) {
	db, err := sql.Open("sqlite3", "looper2.db")
	if err != nil {
		return nil, err
	}

    // Write-Ahead Logging for concurrency
    if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
        return nil, err
    }

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

	var config Config
	release_var := os.Getenv("LOOPER_RELEASE")
	config.ReleaseMode = release_var != "" && release_var != "0"
	if config.ReleaseMode {
		log.Println("Release mode")
	}
	config.StartupTime = time.Now().Unix()

	return &Deps{
		DB: db,
		Config: config,
	}, nil
}

func (d *Deps) Close() {
	d.DB.Close()
}

