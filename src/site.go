package looper2

import (
	"math/rand/v2"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

var idioms []string = []string{
	"Clean the staples",
	"Advance alchemic knowledge",
	"Journal tribe movements",
	"Wash my pants",
	"Buy ritual paint (3), rags (3)",
	"Pratice swordcraft",
	"Clean the dungeon",
	"Send anonymous prank letters to the King",
	"Hunt",
	"Change oil in lamps",
	"Sell toenails",
	"Fight hornets",
	"Buy sausages (1000 lb)",
	"Feed the platypus bear",
	"Negotiate with beavers",
}

func (d Deps) index(c *gin.Context) {
	// for idioms
	c.Header("Cache-Control", "no-store")

	_, err := c.Cookie("access_token")
	if err != nil {
		c.Redirect(http.StatusFound, "/auth")
		return
	}

	c.HTML(http.StatusOK, "index.tmpl", gin.H{
		"ReleaseMode": d.Config.ReleaseMode,
		"StaticRoot": d.Config.StaticPrefix,
		"Idiom": idioms[rand.IntN(len(idioms))],
	})
}

func (d Deps) authPage(c *gin.Context) {
	// TODO repetitive, fix
	if d.Config.ReleaseMode {
		c.Header("Cache-Control", "no-cache")
	} else {
		c.Header("Cache-Control", "no-store")
	}

	c.HTML(http.StatusOK, "auth.tmpl", gin.H{
		"ReleaseMode": d.Config.ReleaseMode,
		"StaticRoot": d.Config.StaticPrefix,
	})
}

func (d Deps) favicon_dummy(c *gin.Context) {
	c.Redirect(http.StatusFound, d.Config.StaticPrefix + "/favicon.png")
}

func (d Deps) static_routes(c *gin.Context) {
	if d.Config.ReleaseMode {
		c.Header("Cache-Control", "public, max-age=3153600, immutable")
	} else {
		c.Header("Cache-Control", "no-store")
	}

	// net/http protects from path traversal attacks
	c.File(filepath.Join("./static", c.Param("filepath")))
}

func SiteRoutes(router *gin.Engine, deps *Deps) {
	router.LoadHTMLGlob("templates/*")
	router.GET("/static/:version/*filepath", deps.static_routes)
	router.GET("/favicon.ico", deps.favicon_dummy)
	router.GET("/", deps.index)
	router.GET("/auth", deps.authPage)
}
