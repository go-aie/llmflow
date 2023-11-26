// Code generated by kun; DO NOT EDIT.
// github.com/RussellLuo/kun

package api

import (
	"reflect"

	"github.com/RussellLuo/kun/pkg/oas2"
)

var (
	base = `swagger: "2.0"
info:
  title: "No Title"
  version: "0.0.0"
  description: ""
  license:
    name: "MIT"
host: "example.com"
basePath: "/"
schemes:
  - "https"
consumes:
  - "application/json"
produces:
  - "application/json"
`

	paths = `
paths:
  /flows/{name}:
    delete:
      description: ""
      summary: ""
      operationId: "DeleteFlow"
      parameters:
        - name: name
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
      %s
    get:
      description: ""
      summary: ""
      operationId: "GetFlow"
      parameters:
        - name: name
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
      %s
    put:
      description: ""
      summary: ""
      operationId: "UpsertFlow"
      parameters:
        - name: name
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
        - name: body
          in: body
          schema:
            $ref: "#/definitions/UpsertFlowRequestBody"
      %s
  /tools/{group}:
    delete:
      description: ""
      summary: ""
      operationId: "DeleteTool"
      parameters:
        - name: group
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
        - name: body
          in: body
          schema:
            $ref: "#/definitions/DeleteToolRequestBody"
      %s
    put:
      description: ""
      summary: ""
      operationId: "UpsertTool"
      parameters:
        - name: group
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
        - name: body
          in: body
          schema:
            $ref: "#/definitions/UpsertToolRequestBody"
      %s
  /schemas:
    get:
      description: ""
      summary: ""
      operationId: "GetSchemas"
      parameters:
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
      %s
  /tools:
    get:
      description: ""
      summary: ""
      operationId: "GetTools"
      parameters:
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
      %s
  /flows/{name}:run:
    post:
      description: ""
      summary: ""
      operationId: "RunFlow"
      parameters:
        - name: name
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
        - name: body
          in: body
          schema:
            $ref: "#/definitions/RunFlowRequestBody"
      %s
  /flows/{name}:test:
    post:
      description: ""
      summary: ""
      operationId: "TestFlow"
      parameters:
        - name: name
          in: path
          required: true
          type: string
          description: ""
        - name: Authorization
          in: header
          required: true
          type: string
          description: ""
        - name: body
          in: body
          schema:
            $ref: "#/definitions/TestFlowRequestBody"
      %s
`
)

func getResponses(schema oas2.Schema) []oas2.OASResponses {
	return []oas2.OASResponses{
		oas2.GetOASResponses(schema, "DeleteFlow", 200, &DeleteFlowResponse{}),
		oas2.GetOASResponses(schema, "GetFlow", 200, &GetFlowResponse{}),
		oas2.GetOASResponses(schema, "UpsertFlow", 200, &UpsertFlowResponse{}),
		oas2.GetOASResponses(schema, "DeleteTool", 200, &DeleteToolResponse{}),
		oas2.GetOASResponses(schema, "UpsertTool", 200, &UpsertToolResponse{}),
		oas2.GetOASResponses(schema, "GetSchemas", 200, &GetSchemasResponse{}),
		oas2.GetOASResponses(schema, "GetTools", 200, &GetToolsResponse{}),
		oas2.GetOASResponses(schema, "RunFlow", 200, &RunFlowResponse{}),
		oas2.GetOASResponses(schema, "TestFlow", 200, &TestFlowResponse{}),
	}
}

func getDefinitions(schema oas2.Schema) map[string]oas2.Definition {
	defs := make(map[string]oas2.Definition)

	oas2.AddResponseDefinitions(defs, schema, "DeleteFlow", 200, (&DeleteFlowResponse{}).Body())

	oas2.AddDefinition(defs, "DeleteToolRequestBody", reflect.ValueOf(&struct {
		Typ string `json:"typ"`
	}{}))
	oas2.AddResponseDefinitions(defs, schema, "DeleteTool", 200, (&DeleteToolResponse{}).Body())

	oas2.AddResponseDefinitions(defs, schema, "GetFlow", 200, (&GetFlowResponse{}).Body())

	oas2.AddResponseDefinitions(defs, schema, "GetSchemas", 200, (&GetSchemasResponse{}).Body())

	oas2.AddResponseDefinitions(defs, schema, "GetTools", 200, (&GetToolsResponse{}).Body())

	oas2.AddDefinition(defs, "RunFlowRequestBody", reflect.ValueOf((&RunFlowRequest{}).Input))
	oas2.AddResponseDefinitions(defs, schema, "RunFlow", 200, (&RunFlowResponse{}).Body())

	oas2.AddDefinition(defs, "TestFlowRequestBody", reflect.ValueOf((&TestFlowRequest{}).Input))
	oas2.AddResponseDefinitions(defs, schema, "TestFlow", 200, (&TestFlowResponse{}).Body())

	oas2.AddDefinition(defs, "UpsertFlowRequestBody", reflect.ValueOf((&UpsertFlowRequest{}).Definition))
	oas2.AddResponseDefinitions(defs, schema, "UpsertFlow", 200, (&UpsertFlowResponse{}).Body())

	oas2.AddDefinition(defs, "UpsertToolRequestBody", reflect.ValueOf(&struct {
		Typ  string `json:"typ"`
		Tool Tool   `json:"tool"`
	}{}))
	oas2.AddResponseDefinitions(defs, schema, "UpsertTool", 200, (&UpsertToolResponse{}).Body())

	return defs
}

func OASv2APIDoc(schema oas2.Schema) string {
	resps := getResponses(schema)
	paths := oas2.GenPaths(resps, paths)

	defs := getDefinitions(schema)
	definitions := oas2.GenDefinitions(defs)

	return base + paths + definitions
}
