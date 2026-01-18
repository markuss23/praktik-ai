
# CourseLink

Schema pro odkaz kurzu

## Properties

Name | Type
------------ | -------------
`linkId` | number
`courseId` | number
`url` | string

## Example

```typescript
import type { CourseLink } from ''

// TODO: Update the object below with actual values
const example = {
  "linkId": null,
  "courseId": null,
  "url": null,
} satisfies CourseLink

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CourseLink
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


