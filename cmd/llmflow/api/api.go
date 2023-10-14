package api

import (
	"context"
)

//go:generate kungen ./api.go Service

type Service interface {
	//kun:op PUT /tasks/{name}
	//kun:param __ in=header name=Authorization required=true
	UpsertTask(ctx context.Context, name string, definition map[string]any) (err error)

	//kun:op DELETE /tasks/{name}
	//kun:param __ in=header name=Authorization required=true
	DeleteTask(ctx context.Context, name string) (err error)

	//kun:op GET /tasks/{name}
	//kun:param __ in=header name=Authorization required=true
	GetTask(ctx context.Context, name string) (definition map[string]any, err error)

	//kun:op GET /schemas
	//kun:param __ in=header name=Authorization required=true
	GetSchemas(ctx context.Context) (schemas map[string]any, err error)

	//kun:op POST /
	//kun:param __ in=header name=Authorization required=true
	//kun:success body=output
	Execute(ctx context.Context, name string, input map[string]any) (output map[string]any, err error)
}
