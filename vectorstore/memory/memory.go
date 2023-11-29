package memory

import (
	"context"
	"sync"

	"golang.org/x/exp/maps"
	"golang.org/x/exp/slices"
	"gonum.org/v1/gonum/mat"

	"github.com/go-aie/llmflow"
)

// Memory is an in-memory vector store.
type Memory struct {
	documents map[string][]*llmflow.Document
	mu        sync.RWMutex
}

func New() *Memory {
	return &Memory{
		documents: make(map[string][]*llmflow.Document),
	}
}

func (m *Memory) Upsert(ctx context.Context, documents []*llmflow.Document) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, doc := range documents {
		sourceID := doc.Metadata.SourceID
		m.documents[sourceID] = append(m.documents[sourceID], doc)
	}
	return nil
}

func (m *Memory) Query(ctx context.Context, vector llmflow.Vector, topK int, minScore float64) ([]*llmflow.Similarity, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if topK <= 0 {
		return []*llmflow.Similarity{}, nil // return `[]` in JSON
	}

	target := mat.NewVecDense(len(vector), vector)

	similarities := make([]*llmflow.Similarity, 0, topK) // Avoid null JSON array.
	for _, docs := range m.documents {
		for _, doc := range docs {
			candidate := mat.NewVecDense(len(doc.Vector), doc.Vector)
			score := mat.Dot(target, candidate)
			if score >= minScore {
				similarities = append(similarities, &llmflow.Similarity{
					Document: &llmflow.Document{
						ID:       doc.ID,
						Text:     doc.Text,
						Metadata: doc.Metadata,
						Extra:    doc.Extra,
					},
					Score: score,
				})
			}
		}
	}

	// Sort similarities by score in descending order.
	slices.SortStableFunc(similarities, func(a, b *llmflow.Similarity) int {
		if a.Score > b.Score {
			return -1
		} else if a.Score == b.Score {
			return 0
		} else {
			return 1
		}
	})

	if len(similarities) <= topK {
		return similarities, nil
	}
	return similarities[:topK], nil
}

func (m *Memory) Delete(ctx context.Context, sourceIDs ...string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(sourceIDs) == 0 {
		maps.Clear(m.documents)
	}
	for _, sourceID := range sourceIDs {
		delete(m.documents, sourceID)
	}

	return nil
}
