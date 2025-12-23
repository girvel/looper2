package looper2

import (
	"fmt"
	"strings"
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
	tokenParsed, err := jwt.Parse(
		token,
		func(token *jwt.Token) (any, error) { return key, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(),
	)
	if err != nil {
		return "", "", err
	}

	claims, ok := tokenParsed.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", fmt.Errorf("Unable to cast claims")
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return "", "", fmt.Errorf("No subject in JWT claims")
	}

	scopeAny, ok := claims["scope"]
	if !ok {
		return "", "", fmt.Errorf("scope claim is missing")
	}

	scope, ok := scopeAny.(string)
	if !ok {
		return "", "", fmt.Errorf("scope claim should be of type string")
	}

	return sub, scope, nil
}

func MatchScope(c *gin.Context, scope string) bool {
	if scope != "*" {
		endpointScope := strings.TrimSuffix(c.Request.Method + ":" + c.FullPath(), "/")
		return strings.TrimSuffix(scope, "/") == endpointScope
	}
	return true
}
