package llmflow

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/RussellLuo/orchestrator"
	"github.com/go-openapi/jsonpointer"
)

const TypeJSONLinesLoader = "jsonlines_loader"
const TypeTextLoader = "text_loader"

func init() {
	MustRegisterJSONLinesLoader(orchestrator.GlobalRegistry)
	MustRegisterTextLoader(orchestrator.GlobalRegistry)
}

func MustRegisterJSONLinesLoader(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeJSONLinesLoader,
		New:  func() orchestrator.Task { return new(JSONLinesLoader) },
	})
}

func MustRegisterTextLoader(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeTextLoader,
		New:  func() orchestrator.Task { return new(TextLoader) },
	})
}

type JSONLinesLoader struct {
	orchestrator.TaskHeader

	Input struct {
		ID        string                    `json:"id"`
		Filename  orchestrator.Expr[string] `json:"filename"`
		Content   orchestrator.Expr[string] `json:"content"`
		Pointer   string                    `json:"pointer"`
		BatchSize int                       `json:"batch_size"`
	} `json:"input"`

	Output struct {
		Documents []*Document `json:"documents"`
	}
}

func (l *JSONLinesLoader) String() string {
	return fmt.Sprintf("%s(name:%s)", l.Type, l.Name)
}

func (l *JSONLinesLoader) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	filename, err := l.Input.Filename.EvaluateX(input)
	if err != nil {
		return nil, err
	}

	content, err := l.Input.Content.EvaluateX(input)
	if err != nil {
		return nil, err
	}

	var file io.ReadCloser
	switch {
	case content != "":
		buf := bytes.NewBufferString(content)
		file = ioutil.NopCloser(buf)

	case filename != "":
		// If no `content` is specified, the content will be read from the specified file.

		var err error
		file, err = os.Open(filename)
		if err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("either filename or content must be specified")
	}

	iterator := orchestrator.NewIterator(ctx, func(sender *orchestrator.IteratorSender) {
		defer sender.End() // End the iteration

		defer file.Close() // Close the file

		id := l.Input.ID
		if id == "" {
			id = filepath.Base(filename)
		}

		batchSize := l.Input.BatchSize
		if batchSize == 0 {
			batchSize = 50
		}
		docs := NewBoundedContainer[*Document](batchSize)

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := scanner.Bytes()
			var v any
			if err := json.Unmarshal(line, &v); err != nil {
				sender.Send(nil, err)
				return
			}
			fmt.Printf("JSON Line: %s\n", line)

			// Ignore `null` JSON lines.
			if v == nil {
				continue
			}

			p, err := jsonpointer.New(l.Input.Pointer)
			if err != nil {
				sender.Send(nil, err)
				return
			}
			result, _, err := p.Get(v)
			if err != nil {
				sender.Send(nil, err)
				return
			}

			isFull := docs.Append(&Document{
				ID:   id,
				Text: fmt.Sprintf("%v", result), // Always convert result to a string.
				Metadata: Metadata{
					SourceID: id,
				},
				Extra: string(line),
			})
			if isFull {
				items := docs.PopAll()

				output, err := orchestrator.DefaultCodec.Encode(struct {
					Documents []*Document `json:"documents"`
				}{
					Documents: items,
				})
				if err != nil {
					sender.Send(nil, err)
					return
				}

				if continue_ := sender.Send(output.(map[string]any), nil); !continue_ {
					return
				}
			}
		}

		if err := scanner.Err(); err != nil {
			sender.Send(nil, err)
			return
		}

		// Send all the remaining documents, if any.
		items := docs.PopAll()
		if len(items) > 0 {
			output, err := orchestrator.DefaultCodec.Encode(struct {
				Documents []*Document `json:"documents"`
			}{
				Documents: items,
			})
			if err != nil {
				sender.Send(nil, err)
				return
			}

			sender.Send(output.(map[string]any), nil)
		}
	})
	return orchestrator.Output{"iterator": iterator}, nil
}

type JSONLinesLoaderBuilder struct {
	task *JSONLinesLoader
}

func NewJSONLinesLoader(name string) *JSONLinesLoaderBuilder {
	task := &JSONLinesLoader{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeJSONLinesLoader,
		},
	}
	return &JSONLinesLoaderBuilder{task: task}
}

func (b *JSONLinesLoaderBuilder) Build() orchestrator.Task { return b.task }

type TextLoader struct {
	orchestrator.TaskHeader

	Input struct {
		ID       string `json:"id"`
		Filename string `json:"filename"`
	} `json:"input"`
}

func (l *TextLoader) String() string {
	return fmt.Sprintf("%s(name:%s)", l.Type, l.Name)
}

func (l *TextLoader) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	id := l.Input.ID
	if id == "" {
		id = filepath.Base(l.Input.Filename)
	}

	content, err := os.ReadFile(l.Input.Filename)
	if err != nil {
		return nil, err
	}

	docs := []*Document{
		{
			ID:   id,
			Text: string(content),
			Metadata: Metadata{
				SourceID: id,
			},
		},
	}

	output, err := orchestrator.DefaultCodec.Encode(struct {
		Documents []*Document `json:"documents"`
	}{
		Documents: docs,
	})
	if err != nil {
		return nil, err
	}
	//fmt.Printf("loader output: %#v\n", output)

	return output.(map[string]any), nil
}

type TextLoaderBuilder struct {
	task *TextLoader
}

func NewTextLoader(name string) *TextLoaderBuilder {
	task := &TextLoader{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeTextLoader,
		},
	}
	return &TextLoaderBuilder{task: task}
}

func (b *TextLoaderBuilder) Build() orchestrator.Task { return b.task }
