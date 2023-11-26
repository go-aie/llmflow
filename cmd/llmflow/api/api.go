package api

import (
	"context"

	"github.com/RussellLuo/orchestrator"
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

	//kun:op PUT /flows/{name}
	//kun:param __ in=header name=Authorization required=true
	//kun:body definition
	UpsertFlow(ctx context.Context, name string, definition map[string]any) (err error)

	//kun:op DELETE /flows/{name}
	//kun:param __ in=header name=Authorization required=true
	DeleteFlow(ctx context.Context, name string) (err error)

	//kun:op GET /flows/{name}
	//kun:param __ in=header name=Authorization required=true
	GetFlow(ctx context.Context, name string) (definition map[string]any, err error)

	//kun:op GET /schemas
	//kun:param __ in=header name=Authorization required=true
	GetSchemas(ctx context.Context) (schemas map[string]any, err error)

	//kun:op POST /flows/{name}:run
	//kun:param __ in=header name=Authorization required=true
	//kun:body input
	//kun:success body=output
	RunFlow(ctx context.Context, name string, input map[string]any) (output map[string]any, err error)

	//kun:op POST /flows/{name}:test
	//kun:param __ in=header name=Authorization required=true
	//kun:body input
	//kun:success body=event
	TestFlow(ctx context.Context, name string, input map[string]any) (event orchestrator.Event, err error)
}

type Tool struct {
	Type string `json:"type"`
	Name string `json:"name"`
}
