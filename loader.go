package llmflow

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/orchestrator/builtin"
	"github.com/RussellLuo/structool"
	"github.com/go-openapi/jsonpointer"
)

const TypeJSONLinesLoader = "jsonlines_loader"
const TypeTextLoader = "text_loader"

func init() {
	MustRegisterJSONLinesLoader(orchestrator.GlobalRegistry)
	MustRegisterTextLoader(orchestrator.GlobalRegistry)
}

func MustRegisterJSONLinesLoader(r orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeJSONLinesLoader,
		Constructor: func(decoder *structool.Codec, def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			l := &JSONLinesLoader{def: def}
			if err := decoder.Decode(def.InputTemplate, &l.Input); err != nil {
				return nil, err
			}
			return l, nil
		},
	})
}

func MustRegisterTextLoader(r orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeTextLoader,
		Constructor: func(decoder *structool.Codec, def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			l := &TextLoader{def: def}
			if err := decoder.Decode(def.InputTemplate, &l.Input); err != nil {
				return nil, err
			}
			return l, nil
		},
	})
}

type JSONLinesLoader struct {
	def *orchestrator.TaskDefinition

	Input struct {
		ID        string `json:"id"`
		Filename  string `json:"filename"`
		Pointer   string `json:"pointer"`
		BatchSize int    `json:"batch_size"`
	}

	Output struct {
		Documents []*Document `json:"documents"`
	}
}

func NewJSONLinesLoader(name string) *JSONLinesLoader {
	return &JSONLinesLoader{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeJSONLinesLoader,
		},
	}
}

func (l *JSONLinesLoader) Name() string { return l.def.Name }

func (l *JSONLinesLoader) String() string {
	return fmt.Sprintf("%s(name:%s)", l.def.Type, l.def.Name)
}

func (l *JSONLinesLoader) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	iterator := builtin.NewIterator(func(ctx context.Context, ch chan<- builtin.Result) {
		send := func(output orchestrator.Output, err error) (continue_ bool) {
			select {
			case ch <- builtin.Result{Output: output, Err: err}:
				return true
			case <-ctx.Done():
				return false
			}
		}

		file, err := os.Open(l.Input.Filename)
		if err != nil {
			send(nil, err)
			return
		}
		defer file.Close()

		id := l.Input.ID
		if id == "" {
			id = filepath.Base(l.Input.Filename)
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
				send(nil, err)
				return
			}

			p, err := jsonpointer.New(l.Input.Pointer)
			if err != nil {
				send(nil, err)
				return
			}
			result, _, err := p.Get(v)
			if err != nil {
				send(nil, err)
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
					send(nil, err)
					return
				}

				if continue_ := send(output.(map[string]any), nil); !continue_ {
					return
				}
			}
		}

		if err := scanner.Err(); err != nil {
			send(nil, err)
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
				send(nil, err)
				return
			}

			send(output.(map[string]any), nil)
		}

		// End the iteration.
		close(ch)
	})
	return orchestrator.Output{"iterator": iterator}, nil
}

type TextLoader struct {
	def *orchestrator.TaskDefinition

	Input struct {
		ID       string `json:"id"`
		Filename string `json:"filename"`
		Pointer  string `json:"pointer"`
	}
}

func NewTextLoader(name string) *TextLoader {
	return &TextLoader{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeTextLoader,
		},
	}
}

func (l *TextLoader) Name() string { return l.def.Name }

func (l *TextLoader) String() string {
	return fmt.Sprintf("%s(name:%s)", l.def.Type, l.def.Name)
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
