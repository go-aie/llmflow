package api

import (
	"fmt"
	"net/http"

	"github.com/RussellLuo/kun/pkg/httpcodec"
	"github.com/RussellLuo/orchestrator"
)

type EventStream struct {
	httpcodec.JSON
}

func (es *EventStream) EncodeSuccessResponse(w http.ResponseWriter, statusCode int, body interface{}) error {
	output, ok := body.(*map[string]any)
	if ok {
		iterator, ok := orchestrator.Output(*output).Iterator()
		if ok {
			// Stream the response payload as events (i.e. Sever-Sent Events).
			return es.sendEvents(w, statusCode, iterator)
		}
	}

	return es.JSON.EncodeSuccessResponse(w, statusCode, body)
}

// sendEvents sends events to the client.
func (es *EventStream) sendEvents(w http.ResponseWriter, statusCode int, iterator *orchestrator.Iterator) error {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming unsupported")
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	w.WriteHeader(statusCode)
	flusher.Flush()

	for result := range iterator.Next() {
		if result.Err != nil {
			return result.Err
		}

		// For simplicity, currently:
		// - We assume that this iterator is from the HTTP response body.
		// - We only send data-only events.
		data, ok := result.Output["data"]
		if !ok {
			continue
		}

		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	return nil
}
