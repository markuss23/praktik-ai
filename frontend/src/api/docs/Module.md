
# Module


## Properties

Name | Type
------------ | -------------
`title` | string
`order` | number
`moduleId` | number
`courseId` | number
`isActive` | boolean

## Example

```typescript
import type { Module } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "order": null,
  "moduleId": null,
  "courseId": null,
  "isActive": null,
} satisfies Module

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Module
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


