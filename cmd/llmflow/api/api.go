package api

import (
	"context"
)

//go:generate kungen ./api.go Service

type Service interface {
	//kun:op GET /tools
	//kun:param __ in=header name=Authorization required=true
	GetTools(ctx context.Context) (groups []string, tools map[string][]Tool, err error)

	//kun:op PUT /tools/{group}
	//kun:param __ in=header name=Authorization required=true
	UpsertTool(ctx context.Context, group, typ string, tool Tool) (err error)

	//kun:op DELETE /tools/{group}
	//kun:param __ in=header name=Authorization required=true
	DeleteTool(ctx context.Context, group, typ string) (err error)

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

type Tool struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
}
