package main

import (
	"log"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
	_ "github.com/mattn/go-sqlite3"

	looper2 "github.com/girvel/looper2/src"
)

func init_looper() error {
	deps, err := looper2.NewDeps()
	if err != nil {
		return err
	}
	defer deps.Close()

	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterValidation("notblank", func (fl validator.FieldLevel) bool {
			field := fl.Field()

			switch field.Kind() {
			case reflect.String:
				return strings.TrimSpace(field.String()) != ""

			case reflect.Slice, reflect.Array:
				if field.Type().Elem().Kind() != reflect.String {
					panic(
						"validator 'nonblank' used on non-string collection " + 
						field.Type().String(),
					)
				}

				for i := 0; i < field.Len(); i++ {
					if strings.TrimSpace(field.Index(i).String()) == "" {
						return false
					}
				}
				return true

			default:
				panic("validator 'notblank' used on " + field.Kind().String())
			}
		})
	}

	router := gin.Default()
	looper2.ApiRoutes(router, deps)
	looper2.SiteRoutes(router, deps)

	if gin.Mode() == gin.ReleaseMode {
		log.Println("Active routes:")
		for _, route := range router.Routes() {
			log.Printf("%-6s %-25s --> %s", route.Method, route.Path, route.Handler)
		}
	}

	return router.Run()
}

func main() {
	err := init_looper()
	if err != nil {
		log.Fatalf("Initialization error: %s", err.Error())
	}
}
