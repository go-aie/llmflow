package vectorstore

import (
	"context"
	"fmt"

	"github.com/go-aie/llmflow"
	"github.com/go-aie/llmflow/vectorstore/memory"
	"github.com/go-aie/llmflow/vectorstore/milvus"
)

// The global memory-based vector store.
var globalMemory VectorStore

func init() {
	globalMemory = memory.New()
}

type VectorStore interface {
	Upsert(ctx context.Context, documents []*llmflow.Document) error
	Query(ctx context.Context, vector llmflow.Vector, topK int, minScore float64) (similarities []*llmflow.Similarity, err error)

	// Delete deletes the chunks belonging to the given sourceIDs.
	// As a special case, empty documentIDs means deleting all chunks.
	Delete(ctx context.Context, sourceIDs ...string) error
}

type Config struct {
	// Addr is the address of the vector store server.
	Addr string `json:"addr"`

	// CollectionName is the collection name.
	CollectionName string `json:"collection_name"`

	// Dim is the vector/embedding dimension.
	Dim int `json:"dim"`
}

func New(vendor string, cfg *Config) (VectorStore, error) {
	switch vendor {
	case "memory":
		return globalMemory, nil

	case "milvus":
		return milvus.New(&milvus.Config{
			Addr:           cfg.Addr,
			CollectionName: cfg.CollectionName,
			Dim:            cfg.Dim,
		})

	default:
		return nil, fmt.Errorf("unsupported vendor: %s", vendor)
	}
}
