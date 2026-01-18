
# GenerateCourseResponse

Response s vygenerovaným kurzem

## Properties

Name | Type
------------ | -------------
`title` | string
`modules` | Array&lt;{ [key: string]: any; }&gt;

## Example

```typescript
import type { GenerateCourseResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "modules": null,
} satisfies GenerateCourseResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GenerateCourseResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


