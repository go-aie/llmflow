package llmflow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"text/template"

	"github.com/RussellLuo/orchestrator"
)

const TypeTemplate = "template"

func init() {
	MustRegisterTemplate(orchestrator.GlobalRegistry)
}

func MustRegisterTemplate(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeTemplate,
		New:  func() orchestrator.Task { return new(Template) },
	})
}

// Template is a leaf task that is used to render a template by applying given arguments.
type Template struct {
	orchestrator.TaskHeader

	Input struct {
		Template string                            `json:"template"`
		Args     orchestrator.Expr[map[string]any] `json:"args"`
	} `json:"input"`
}

func (t *Template) String() string {
	return fmt.Sprintf("%s(name:%s)", t.Type, t.Name)
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

	return orchestrator.Output{
		"result": result,
	}, nil
}

type TemplateBuilder struct {
	task *Template
}

func NewTemplate(name string) *TemplateBuilder {
	task := &Template{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeTemplate,
		},
	}
	return &TemplateBuilder{task: task}
}

func (b *TemplateBuilder) Build() orchestrator.Task { return b.task }
