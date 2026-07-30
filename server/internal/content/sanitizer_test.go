package content

import (
	"strings"
	"testing"
)

func TestSanitizerRemovesExecutableMarkup(t *testing.T) {
	input := `<p onclick="alert(1)">hello<script>alert(1)</script>` +
		`<a href="javascript:alert(1)">bad</a>` +
		`<img src="https://images.example/a.png" onerror="alert(1)"></p>`
	output := NewSanitizer().HTML(input)

	for _, forbidden := range []string{"onclick", "<script", "javascript:", "onerror"} {
		if strings.Contains(strings.ToLower(output), forbidden) {
			t.Fatalf("sanitized output still contains %q: %s", forbidden, output)
		}
	}
	if !strings.Contains(output, "https://images.example/a.png") {
		t.Fatalf("safe image URL was removed: %s", output)
	}
}

func TestSanitizerKeepsEditorStructureAndSafeAlignment(t *testing.T) {
	input := `<h2 style="text-align: center; position: fixed">Title</h2>` +
		`<table><tbody><tr><td colspan="2">cell</td></tr></tbody></table>` +
		`<mark>highlight</mark><ul data-type="taskList"><li>item</li></ul>`
	output := NewSanitizer().HTML(input)

	for _, expected := range []string{
		"<h2 style=\"text-align: center\">",
		"<table>",
		`colspan="2"`,
		"<mark>",
		"<ul>",
	} {
		if !strings.Contains(output, expected) {
			t.Fatalf("sanitized output does not contain %q: %s", expected, output)
		}
	}
	if strings.Contains(output, "position") {
		t.Fatalf("unsafe style survived: %s", output)
	}
}
