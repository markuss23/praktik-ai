# CoursesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createCourse**](CoursesApi.md#createcourse) | **POST** /api/v1/courses | Endp Create Course |
| [**createCourseLink**](CoursesApi.md#createcourselink) | **POST** /api/v1/courses/{course_id}/links | Endp Create Course Link |
| [**deleteCourse**](CoursesApi.md#deletecourse) | **DELETE** /api/v1/courses/{course_id} | Endp Delete Course |
| [**deleteCourseFile**](CoursesApi.md#deletecoursefile) | **DELETE** /api/v1/courses/{course_id}/files/{file_id} | Endp Delete Course File |
| [**deleteCourseLink**](CoursesApi.md#deletecourselink) | **DELETE** /api/v1/courses/{course_id}/links/{link_id} | Endp Delete Course Link |
| [**getCourse**](CoursesApi.md#getcourse) | **GET** /api/v1/courses/{course_id} | Endp Get Course |
| [**listCourseLinks**](CoursesApi.md#listcourselinks) | **GET** /api/v1/courses/{course_id}/links | Endp List Course Links |
| [**listCourses**](CoursesApi.md#listcourses) | **GET** /api/v1/courses | List Courses |
| [**updateCourse**](CoursesApi.md#updatecourse) | **PUT** /api/v1/courses/{course_id} | Endp Update Course |
| [**uploadCourseFile**](CoursesApi.md#uploadcoursefile) | **POST** /api/v1/courses/{course_id}/files | Endp Upload Course File |



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


## createCourseLink

> CourseLink createCourseLink(courseId, url)

Endp Create Course Link

Vytvoří odkaz ke kurzu

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { CreateCourseLinkRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
    // string
    url: url_example,
  } satisfies CreateCourseLinkRequest;

  try {
    const data = await api.createCourseLink(body);
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
| **url** | `string` |  | [Defaults to `undefined`] |

### Return type

[**CourseLink**](CourseLink.md)

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


## deleteCourseFile

> deleteCourseFile(courseId, fileId)

Endp Delete Course File

Smaže soubor kurzu

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { DeleteCourseFileRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
    // number
    fileId: 56,
  } satisfies DeleteCourseFileRequest;

  try {
    const data = await api.deleteCourseFile(body);
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
| **fileId** | `number` |  | [Defaults to `undefined`] |

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


## deleteCourseLink

> deleteCourseLink(courseId, linkId)

Endp Delete Course Link

Smaže odkaz kurzu

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { DeleteCourseLinkRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
    // number
    linkId: 56,
  } satisfies DeleteCourseLinkRequest;

  try {
    const data = await api.deleteCourseLink(body);
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
| **linkId** | `number` |  | [Defaults to `undefined`] |

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


## listCourseLinks

> Array&lt;CourseLink&gt; listCourseLinks(courseId)

Endp List Course Links

Vrátí seznam odkazů ke kurzu

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { ListCourseLinksRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
  } satisfies ListCourseLinksRequest;

  try {
    const data = await api.listCourseLinks(body);
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

[**Array&lt;CourseLink&gt;**](CourseLink.md)

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


## uploadCourseFile

> CourseFile uploadCourseFile(courseId, file)

Endp Upload Course File

Nahraje soubor ke kurzu

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { UploadCourseFileRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // number
    courseId: 56,
    // Blob
    file: BINARY_DATA_HERE,
  } satisfies UploadCourseFileRequest;

  try {
    const data = await api.uploadCourseFile(body);
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
| **file** | `Blob` |  | [Defaults to `undefined`] |

### Return type

[**CourseFile**](CourseFile.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

