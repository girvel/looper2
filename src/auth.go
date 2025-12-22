package looper2

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func IssueToken(sub string, lifetime int64, key []byte) (string, error) {
	now := time.Now().Unix()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss": "looper2",
		"sub": sub,
		"exp": now + lifetime,
		"iat": now,
	})

	return token.SignedString(key)
}

// Returns username
func ValidateToken(token string, key []byte) (string, error) {
	token_parsed, err := jwt.Parse(
		token,
		func(token *jwt.Token) (any, error) { return key, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuedAt(),
	)
	if err != nil {
		return "", err
	}

	claims, ok := token_parsed.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("Unable to cast claims")
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return "", fmt.Errorf("No subject in JWT claims")
	}

	return sub, nil
}
