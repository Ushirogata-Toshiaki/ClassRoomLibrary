type Course = GoogleAppsScript.Classroom.Schema.Course;
type CourseWork = GoogleAppsScript.Classroom.Schema.CourseWork;
type StudentSubmission = GoogleAppsScript.Classroom.Schema.StudentSubmission;
type Student = GoogleAppsScript.Classroom.Schema.Student;
type SubmissiontInfo = {
  'submissionDate': Date | undefined,
  'isLate': boolean
}
type SubmitCount = {
  'submit': number, //提出
  'not_submit': number, //未提出
  'grade': number,//採点済
  'not_grade': number, //未採点
}
type StudentReslut = {
  'studentId': string  ,
  'name': string,
  'id': string,
  'point': number | undefined,
  'submissionInfo': SubmissiontInfo,
  'attachments': GoogleAppsScript.Classroom.Schema.Attachment[] | undefined
}
type CourseWorkResult = {
  'title': string,
  'id': string,
  'url': string,
  'topic': string | undefined,
  'due': Date | undefined,
  'maxPoint': number | undefined,
  'submitCount': SubmitCount,
  'studentReslut': StudentReslut[]
}