
# Course


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`modulesCount` | number
`courseId` | number
`isActive` | boolean
`status` | [Status](Status.md)
`summary` | string
`modules` | [Array&lt;Module&gt;](Module.md)
`files` | [Array&lt;CourseFile&gt;](CourseFile.md)
`links` | [Array&lt;CourseLink&gt;](CourseLink.md)

## Example

```typescript
import type { Course } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "modulesCount": null,
  "courseId": null,
  "isActive": null,
  "status": null,
  "summary": null,
  "modules": null,
  "files": null,
  "links": null,
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


