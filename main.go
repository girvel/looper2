package main

import (
	"log"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"

	looper2 "github.com/girvel/looper2/src"
)

func run() error {
	deps, err := looper2.NewDeps()
	if err != nil {
		return err
	}
	defer deps.Close()

	router := gin.Default()
	router.SetTrustedProxies(nil) // running behind nginx
	looper2.ApiRoutes(router, deps)
	router.Run()
	
	return nil
}

func main() {
	err := run()
	if err != nil {
		log.Fatal(err)
	}
}
