package looper2

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func IssueToken(sub, scope string, lifetime int64, key []byte) (string, error) {
	now := time.Now().Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "looper2",
		"sub": sub,
		"scope": scope,
		"exp": now + lifetime,
		"iat": now,
	})

	return token.SignedString(key)
}

// Returns username
func ValidateToken(token string, key []byte) (string, string, error) {
	token_parsed, err := jwt.Parse(
		token,
		func(token *jwt.Token) (any, error) { return key, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(),
	)
	if err != nil {
		return "", "", err
	}

	claims, ok := token_parsed.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", fmt.Errorf("Unable to cast claims")
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return "", "", fmt.Errorf("No subject in JWT claims")
	}

	scope_any, ok := claims["scope"]
	if !ok {
		return "", "", fmt.Errorf("scope claim is missing")
	}

	scope, ok := scope_any.(string)
	if !ok {
		return "", "", fmt.Errorf("scope claim should be of type string")
	}

	return sub, scope, nil
}

func MatchScope(c *gin.Context, scope string) bool {
	if scope != "*" {
		endpoint_scope := c.Request.Method + ":" + c.FullPath()
		return scope == endpoint_scope
	}
	return true
}
