
# Course


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`isPublished` | boolean
`courseId` | number
`isActive` | boolean
`modules` | [Array&lt;Module&gt;](Module.md)

## Example

```typescript
import type { Course } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "isPublished": null,
  "courseId": null,
  "isActive": null,
  "modules": null,
} satisfies Course

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Course
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


