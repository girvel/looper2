package looper2

import (
	"math/rand/v2"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func (d Deps) index(c *gin.Context) {
	releaseMode := gin.Mode() == gin.ReleaseMode

	var version string
	if releaseMode {
		version = strconv.FormatInt(d.StartupTime, 10)
	} else {
		version = "dev"
	}

	c.HTML(http.StatusOK, "index.tmpl", gin.H{
		"ReleaseMode": releaseMode,
		"StaticRoot": "/static/" + version,
		"Idiom": idioms[rand.IntN(len(idioms))],
	})
}

func (d Deps) static_routes(c *gin.Context) {
	if gin.Mode() == gin.ReleaseMode {
		c.Header("Cache-Control", "public, max-age=3153600, immutable")
	} else {
		c.Header("Cache-Control", "no-store")
	}

	c.File(filepath.Join("./static", c.Param("filepath")))
}

func SiteRoutes(router *gin.Engine, deps *Deps) {
	router.LoadHTMLGlob("templates/*")
	router.GET("/static/:version/*filepath", deps.static_routes)
	router.GET("/", deps.index)
}
