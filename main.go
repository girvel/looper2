package main

import (
	"log"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"

	looper2 "github.com/girvel/looper2/src"
)

func init_looper() error {
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
	err := init_looper()
	if err != nil {
		log.Fatalf("Initialization error: %s", err.Error())
	}
}
