package llmflow

import (
	"context"
	"fmt"
	"strings"

	"github.com/RussellLuo/orchestrator"
)

const TypeSplitter = "splitter"

func init() {
	MustRegisterSplitter(orchestrator.GlobalRegistry)
}

func MustRegisterSplitter(r *orchestrator.Registry) {
	r.MustRegister(&orchestrator.TaskFactory{
		Type: TypeSplitter,
		New:  func() orchestrator.Task { return new(Splitter) },
	})
}

type Splitter struct {
	orchestrator.TaskHeader

	Input struct {
		Documents  orchestrator.Expr[[]*Document] `json:"documents"`
		SplitChars []string                       `json:"split_chars"`
		ChunkSize  int                            `json:"chunk_size"`
	} `json:"input"`
}

func (s *Splitter) Init(r *orchestrator.Registry) error {
	if len(s.Input.SplitChars) == 0 {
		s.Input.SplitChars = []string{"\n", "。", "！", "？"}
	}
	return nil
}

func (s *Splitter) String() string {
	return fmt.Sprintf("%s(name:%s)", s.Type, s.Name)
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
		for _, char := range s.Input.SplitChars {
			for _, c := range []rune(char) {
				if c == r {
					return true
				}
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

type SplitterBuilder struct {
	task *Splitter
}

func NewSplitter(name string) *SplitterBuilder {
	task := &Splitter{
		TaskHeader: orchestrator.TaskHeader{
			Name: name,
			Type: TypeSplitter,
		},
	}
	return &SplitterBuilder{task: task}
}

func (b *SplitterBuilder) Build() orchestrator.Task { return b.task }
