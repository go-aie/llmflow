package llmflow

type Metadata struct {
	// The source ID of the document.
	//
	// Source/Document has different meanings in different scenarios. For example:
	//
	// 1. Document Splitting
	//   Source => The whole Document
	//   Document => Single Chunk
	//
	// 2. Knowledge Base
	//   Source => The whole Knowledge Base
	//   Document => Single Knowledge Point
	SourceID string `json:"source_id,omitempty"`

	// The user ID. Typically useful in multi-tenant scenario.
	UserID string `json:"user_id,omitempty"`

	// The collection name. Only useful for vector stores that support the
	// concept of Collection (e.g. Milvus, Typesense).
	CollectionID string `json:"collection_id,omitempty"`
}

type Document struct {
	ID       string   `json:"id,omitempty"`
	Text     string   `json:"text,omitempty"`
	Vector   Vector   `json:"vector,omitempty"`
	Metadata Metadata `json:"metadata,omitempty"`

	// Extra data as a JSON string.
	Extra string `json:"extra,omitempty"`
}

type Similarity struct {
	*Document

	Score float64 `json:"score,omitempty"`
}

type Vector []float64
