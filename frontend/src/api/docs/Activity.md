
# Activity


## Properties

Name | Type
------------ | -------------
`title` | string
`content` | { [key: string]: any; }
`order` | number
`kind` | [ActivityKind](ActivityKind.md)
`activityId` | number
`moduleId` | number
`isActive` | boolean

## Example

```typescript
import type { Activity } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "content": null,
  "order": null,
  "kind": null,
  "activityId": null,
  "moduleId": null,
  "isActive": null,
} satisfies Activity

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Activity
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


