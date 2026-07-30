package content

import "github.com/microcosm-cc/bluemonday"

type Sanitizer struct {
	policy *bluemonday.Policy
}

func NewSanitizer() *Sanitizer {
	policy := bluemonday.UGCPolicy()
	policy.AllowElements(
		"figure", "figcaption",
		"table", "thead", "tbody", "tfoot", "tr", "th", "td",
		"mark", "s", "u", "sub", "sup",
	)
	policy.AllowAttrs("colspan", "rowspan").OnElements("th", "td")
	policy.AllowAttrs("data-language").OnElements("pre", "code")
	policy.AllowStyles("text-align").
		MatchingEnum("left", "center", "right", "justify").
		OnElements("p", "h1", "h2", "h3", "h4", "h5", "h6")
	policy.RequireNoFollowOnLinks(true)
	policy.RequireNoReferrerOnLinks(true)
	policy.AddTargetBlankToFullyQualifiedLinks(true)

	return &Sanitizer{policy: policy}
}

func (s *Sanitizer) HTML(value string) string {
	return s.policy.Sanitize(value)
}
