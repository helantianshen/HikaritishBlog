package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type dataResponse struct {
	Data any `json:"data"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

func respond(c *gin.Context, status int, data any) {
	c.JSON(status, dataResponse{Data: data})
}

func fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, errorResponse{
		Error: errorBody{Code: code, Message: message},
	})
}

func internalError(c *gin.Context) {
	fail(c, http.StatusInternalServerError, "internal_error", "服务器处理请求时发生错误")
}
