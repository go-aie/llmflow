package api

import (
	"fmt"
	"mime"
	"net/http"

	"github.com/RussellLuo/kun/pkg/httpcodec"
	"github.com/RussellLuo/kun/pkg/werror"
	"github.com/RussellLuo/kun/pkg/werror/gcode"
	"github.com/RussellLuo/orchestrator"
	"sigs.k8s.io/yaml/goyaml.v3"
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

type JSONOrYAML struct {
	httpcodec.JSON
}

func (jy *JSONOrYAML) DecodeRequestBody(r *http.Request, out interface{}) error {
	contentType := r.Header.Get("Content-Type")
	mediaType := "application/json"

	if contentType != "" {
		var err error
		mediaType, _, err = mime.ParseMediaType(contentType)
		if err != nil {
			return err
		}
	}

	switch mediaType {
	case "application/json":
		return jy.JSON.DecodeRequestBody(r, out)

	case "application/yaml":
		if err := yaml.NewDecoder(r.Body).Decode(out); err != nil {
			return werror.Wrap(gcode.ErrInvalidArgument, err)
		}

	default:
		return werror.Wrapf(gcode.ErrInvalidArgument, "unsupported Media Type: %q", mediaType)
	}

	return nil
}
