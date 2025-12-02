# CoursesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createCourse**](CoursesApi.md#createcourse) | **POST** /api/v1/courses | Endp Create Course |
| [**deleteCourse**](CoursesApi.md#deletecourse) | **DELETE** /api/v1/courses/{course_id} | Endp Delete Course |
| [**getCourse**](CoursesApi.md#getcourse) | **GET** /api/v1/courses/{course_id} | Endp Get Course |
| [**listCourses**](CoursesApi.md#listcourses) | **GET** /api/v1/courses | List Courses |
| [**updateCourse**](CoursesApi.md#updatecourse) | **PUT** /api/v1/courses/{course_id} | Endp Update Course |



## createCourse

> Course createCourse(courseCreate)

Endp Create Course

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { CreateCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // CourseCreate
    courseCreate: ...,
  } satisfies CreateCourseRequest;

  try {
    const data = await api.createCourse(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseCreate** | [CourseCreate](CourseCreate.md) |  | |

### Return type

[**Course**](Course.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteCourse

> deleteCourse(courseId)

Endp Delete Course

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { DeleteCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
  } satisfies DeleteCourseRequest;

  try {
    const data = await api.deleteCourse(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseId** | `number` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCourse

> Course getCourse(courseId)

Endp Get Course

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { GetCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
  } satisfies GetCourseRequest;

  try {
    const data = await api.getCourse(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Course**](Course.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listCourses

> Array&lt;Course&gt; listCourses(includeInactive, isPublished, textSearch)

List Courses

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { ListCoursesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // boolean | Include inactive records (optional)
    includeInactive: true,
    // boolean | Filter by published status (optional)
    isPublished: true,
    // string | Text to search for (optional)
    textSearch: textSearch_example,
  } satisfies ListCoursesRequest;

  try {
    const data = await api.listCourses(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **includeInactive** | `boolean` | Include inactive records | [Optional] [Defaults to `false`] |
| **isPublished** | `boolean` | Filter by published status | [Optional] [Defaults to `false`] |
| **textSearch** | `string` | Text to search for | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;Course&gt;**](Course.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateCourse

> Course updateCourse(courseId, courseUpdate)

Endp Update Course

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { UpdateCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
    // CourseUpdate
    courseUpdate: ...,
  } satisfies UpdateCourseRequest;

  try {
    const data = await api.updateCourse(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseId** | `number` |  | [Defaults to `undefined`] |
| **courseUpdate** | [CourseUpdate](CourseUpdate.md) |  | |

### Return type

[**Course**](Course.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

