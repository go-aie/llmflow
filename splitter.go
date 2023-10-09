package llmflow

import (
	"context"
	"fmt"
	"strings"

	"github.com/RussellLuo/orchestrator"
	"github.com/RussellLuo/structool"
)

const TypeSplitter = "splitter"

func init() {
	MustRegisterSplitter(orchestrator.GlobalRegistry)
}

func MustRegisterSplitter(r orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeSplitter,
		Constructor: func(decoder *structool.Codec, def *orchestrator.TaskDefinition) (orchestrator.Task, error) {
			s := &Splitter{def: def}
			if err := decoder.Decode(def.InputTemplate, &s.Input); err != nil {
				return nil, err
			}
			if len(s.Input.SplitChars) == 0 {
				s.Input.SplitChars = []rune{'\n', '。', '！', '？'}
			}
			return s, nil
		},
	})
}

type Splitter struct {
	def *orchestrator.TaskDefinition

	Input struct {
		Documents  orchestrator.Expr[[]*Document] `json:"documents"`
		SplitChars []rune                         `json:"spilt_chars"`
		ChunkSize  int                            `json:"chunk_size"`
	}
}

func NewSplitter(name string) *Splitter {
	return &Splitter{
		def: &orchestrator.TaskDefinition{
			Name: name,
			Type: TypeSplitter,
		},
	}
}

func (s *Splitter) Name() string { return s.def.Name }

func (s *Splitter) String() string {
	return fmt.Sprintf("%s(name:%s)", s.def.Type, s.def.Name)
}

func (s *Splitter) Execute(ctx context.Context, input orchestrator.Input) (orchestrator.Output, error) {
	if err := s.Input.Documents.Evaluate(input); err != nil {
		return nil, err
	}

	var docs []*Document
	for _, doc := range s.Input.Documents.Value {
		for i, chunk := range s.split(doc.Text) {
			docs = append(docs, &Document{
				ID:   fmt.Sprintf("%s-%d", doc.ID, i),
				Text: chunk,
				Metadata: Metadata{
					SourceID: doc.Metadata.SourceID,
				},
			})
		}
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

func (s *Splitter) split(text string) []string {
	parts := strings.FieldsFunc(text, func(r rune) bool {
		for _, c := range s.Input.SplitChars {
			if c == r {
				return true
			}
		}
		return false
	})

	var chunks []string
	var curChunk string
	for i := 0; i < len(parts)-1; i++ {
		if len(curChunk) > 0 && len(curChunk)+len(parts[i]) > s.Input.ChunkSize {
			chunks = append(chunks, curChunk)
			curChunk = ""
		}
		curChunk += parts[i]
	}

	return chunks
}
