
# CourseFile

Schema pro soubor kurzu

## Properties

Name | Type
------------ | -------------
`fileId` | number
`courseId` | number
`filename` | string
`filePath` | string

## Example

```typescript
import type { CourseFile } from ''

// TODO: Update the object below with actual values
const example = {
  "fileId": null,
  "courseId": null,
  "filename": null,
  "filePath": null,
} satisfies CourseFile

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CourseFile
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


