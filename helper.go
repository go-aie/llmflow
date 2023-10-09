package llmflow

// BoundedContainer is a container with a bounded length.
type BoundedContainer[E any] struct {
	buffer []E
	size   int
}

func NewBoundedContainer[E any](size int) *BoundedContainer[E] {
	return &BoundedContainer[E]{
		buffer: make([]E, 0, size),
		size:   size,
	}
}

// Append adds item to the right side of the container. It will return a boolean
// value indicates whether the container is full after this addition.
func (bc *BoundedContainer[E]) Append(item E) (isFull bool) {
	bc.buffer = append(bc.buffer, item)
	return len(bc.buffer) == bc.size
}

// PopAll removes and returns all items from the container.
func (bc *BoundedContainer[E]) PopAll() []E {
	if len(bc.buffer) == 0 {
		return nil
	}

	// Make a copy of all the items.
	temp := make([]E, len(bc.buffer))
	copy(temp, bc.buffer)

	// Clear the buffer.
	bc.buffer = bc.buffer[:0]
	return temp
}
