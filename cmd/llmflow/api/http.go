// Code generated by kun; DO NOT EDIT.
// github.com/RussellLuo/kun

package api

import (
	"context"
	"net/http"

	"github.com/RussellLuo/kun/pkg/httpcodec"
	"github.com/RussellLuo/kun/pkg/httpoption"
	"github.com/RussellLuo/kun/pkg/oas2"
	"github.com/go-chi/chi"
	kithttp "github.com/go-kit/kit/transport/http"
)

func NewHTTPRouter(svc Service, codecs httpcodec.Codecs, opts ...httpoption.Option) chi.Router {
	r := chi.NewRouter()
	options := httpoption.NewOptions(opts...)

	r.Method("GET", "/api", oas2.Handler(OASv2APIDoc, options.ResponseSchema()))

	var codec httpcodec.Codec
	var validator httpoption.Validator
	var kitOptions []kithttp.ServerOption

	codec = codecs.EncodeDecoder("DeleteTask")
	validator = options.RequestValidator("DeleteTask")
	r.Method(
		"DELETE", "/tasks/{name}",
		kithttp.NewServer(
			MakeEndpointOfDeleteTask(svc),
			decodeDeleteTaskRequest(codec, validator),
			httpcodec.MakeResponseEncoder(codec, 200),
			append(kitOptions,
				kithttp.ServerErrorEncoder(httpcodec.MakeErrorEncoder(codec)),
			)...,
		),
	)

	codec = codecs.EncodeDecoder("Execute")
	validator = options.RequestValidator("Execute")
	r.Method(
		"POST", "/",
		kithttp.NewServer(
			MakeEndpointOfExecute(svc),
			decodeExecuteRequest(codec, validator),
			httpcodec.MakeResponseEncoder(codec, 200),
			append(kitOptions,
				kithttp.ServerErrorEncoder(httpcodec.MakeErrorEncoder(codec)),
			)...,
		),
	)

	codec = codecs.EncodeDecoder("GetSchemas")
	validator = options.RequestValidator("GetSchemas")
	r.Method(
		"GET", "/schemas",
		kithttp.NewServer(
			MakeEndpointOfGetSchemas(svc),
			decodeGetSchemasRequest(codec, validator),
			httpcodec.MakeResponseEncoder(codec, 200),
			append(kitOptions,
				kithttp.ServerErrorEncoder(httpcodec.MakeErrorEncoder(codec)),
			)...,
		),
	)

	codec = codecs.EncodeDecoder("GetTask")
	validator = options.RequestValidator("GetTask")
	r.Method(
		"GET", "/tasks/{name}",
		kithttp.NewServer(
			MakeEndpointOfGetTask(svc),
			decodeGetTaskRequest(codec, validator),
			httpcodec.MakeResponseEncoder(codec, 200),
			append(kitOptions,
				kithttp.ServerErrorEncoder(httpcodec.MakeErrorEncoder(codec)),
			)...,
		),
	)

	codec = codecs.EncodeDecoder("UpsertTask")
	validator = options.RequestValidator("UpsertTask")
	r.Method(
		"PUT", "/tasks/{name}",
		kithttp.NewServer(
			MakeEndpointOfUpsertTask(svc),
			decodeUpsertTaskRequest(codec, validator),
			httpcodec.MakeResponseEncoder(codec, 200),
			append(kitOptions,
				kithttp.ServerErrorEncoder(httpcodec.MakeErrorEncoder(codec)),
			)...,
		),
	)

	return r
}

func decodeDeleteTaskRequest(codec httpcodec.Codec, validator httpoption.Validator) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		var _req DeleteTaskRequest

		name := []string{chi.URLParam(r, "name")}
		if err := codec.DecodeRequestParam("name", name, &_req.Name); err != nil {
			return nil, err
		}

		__ := r.Header.Values("Authorization")
		if err := codec.DecodeRequestParam("__", __, nil); err != nil {
			return nil, err
		}

		if err := validator.Validate(&_req); err != nil {
			return nil, err
		}

		return &_req, nil
	}
}

func decodeExecuteRequest(codec httpcodec.Codec, validator httpoption.Validator) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		var _req ExecuteRequest

		if err := codec.DecodeRequestBody(r, &_req); err != nil {
			return nil, err
		}

		__ := r.Header.Values("Authorization")
		if err := codec.DecodeRequestParam("__", __, nil); err != nil {
			return nil, err
		}

		if err := validator.Validate(&_req); err != nil {
			return nil, err
		}

		return &_req, nil
	}
}

func decodeGetSchemasRequest(codec httpcodec.Codec, validator httpoption.Validator) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		__ := r.Header.Values("Authorization")
		if err := codec.DecodeRequestParam("__", __, nil); err != nil {
			return nil, err
		}

		return nil, nil
	}
}

func decodeGetTaskRequest(codec httpcodec.Codec, validator httpoption.Validator) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		var _req GetTaskRequest

		name := []string{chi.URLParam(r, "name")}
		if err := codec.DecodeRequestParam("name", name, &_req.Name); err != nil {
			return nil, err
		}

		__ := r.Header.Values("Authorization")
		if err := codec.DecodeRequestParam("__", __, nil); err != nil {
			return nil, err
		}

		if err := validator.Validate(&_req); err != nil {
			return nil, err
		}

		return &_req, nil
	}
}

func decodeUpsertTaskRequest(codec httpcodec.Codec, validator httpoption.Validator) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		var _req UpsertTaskRequest

		if err := codec.DecodeRequestBody(r, &_req); err != nil {
			return nil, err
		}

		name := []string{chi.URLParam(r, "name")}
		if err := codec.DecodeRequestParam("name", name, &_req.Name); err != nil {
			return nil, err
		}

		__ := r.Header.Values("Authorization")
		if err := codec.DecodeRequestParam("__", __, nil); err != nil {
			return nil, err
		}

		if err := validator.Validate(&_req); err != nil {
			return nil, err
		}

		return &_req, nil
	}
}
