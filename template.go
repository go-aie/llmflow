package llmflow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/structool"
)

const TypeTemplate = "template"

func init() {
	MustRegisterTemplate(orchestrator.GlobalRegistry)
}

func MustRegisterTemplate(r orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeTemplate,
		Constructor: func(decoder *structool.Codec, def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			t := &Template{def: def}
			if err := decoder.Decode(def.InputTemplate, &t.Input); err != nil {
				return nil, err
			}
			return t, nil
		},
	})
}

type Template struct {
	def *orchestrator.TaskDefinition

	Input struct {
		Template string                            `json:"template"`
		Args     orchestrator.Expr[map[string]any] `json:"args"`
	}
}

func NewTemplate(name string) *Template {
	return &Template{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeTemplate,
		},
	}
}

func (t *Template) Name() string { return t.def.Name }

func (t *Template) String() string {
	return fmt.Sprintf("%s(name:%s)", t.def.Type, t.def.Name)
}

func (t *Template) Execute(ctx context.Context, input orchestrator.Input) (output orchestrator.Output, err error) {
	if err := t.Input.Args.Evaluate(input); err != nil {
		return nil, err
	}

	tmpl, err := template.New("").Funcs(map[string]any{
		"jsonUnmarshal": func(data string) (any, error) {
			var v any
			if err := json.Unmarshal([]byte(data), &v); err != nil {
				return nil, err
			}
			return v, nil
		},
	}).Parse(t.Input.Template)
	if err != nil {
		return nil, err
	}

	args := t.Input.Args.Value
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, args); err != nil {
		return nil, err
	}

	result := buf.String()
	//fmt.Printf("prompt: %s", result)

	return orchestrator.Output{
		"result": result,
	}, nil
}
