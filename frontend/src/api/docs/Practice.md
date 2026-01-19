
# Practice


## Properties

Name | Type
------------ | -------------
`position` | number
`practiceId` | number
`moduleId` | number
`questions` | [Array&lt;PracticeQuestion&gt;](PracticeQuestion.md)

## Example

```typescript
import type { Practice } from ''

// TODO: Update the object below with actual values
const example = {
  "position": null,
  "practiceId": null,
  "moduleId": null,
  "questions": null,
} satisfies Practice

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Practice
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


