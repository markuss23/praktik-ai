
# PracticeQuestion


## Properties

Name | Type
------------ | -------------
`position` | number
`questionType` | [QuestionType](QuestionType.md)
`question` | string
`correctAnswer` | string
`exampleAnswer` | string
`closedOptions` | [Array&lt;PracticeOption&gt;](PracticeOption.md)
`openKeywords` | [Array&lt;QuestionKeyword&gt;](QuestionKeyword.md)
`questionId` | number
`practiceId` | number

## Example

```typescript
import type { PracticeQuestion } from ''

// TODO: Update the object below with actual values
const example = {
  "position": null,
  "questionType": null,
  "question": null,
  "correctAnswer": null,
  "exampleAnswer": null,
  "closedOptions": null,
  "openKeywords": null,
  "questionId": null,
  "practiceId": null,
} satisfies PracticeQuestion

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PracticeQuestion
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


