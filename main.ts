type Course = GoogleAppsScript.Classroom.Schema.Course;
type CourseWork = GoogleAppsScript.Classroom.Schema.CourseWork;
type StudentSubmission = GoogleAppsScript.Classroom.Schema.StudentSubmission;
type Student = GoogleAppsScript.Classroom.Schema.Student;

  
  //課題の提出、未提出を更新
  function countSubmission(submissionList : StudentSubmission[]) : [number,number,number,number]{
    let submit : number = 0; //提出
    let not_submit : number = 0; //未提出
    let grade : number = 0; //採点済
    let not_grade : number = 0; //未採点
  
    for(const states of submissionList){
      switch(states.state){
        case 'NEW':
        not_submit++;
        break;
  
        case 'CREATED':
        not_submit;
        break;
  
        case 'TURNED_IN':
        submit++;
        break;
  
        case 'RETURNED':
        submit++;
        grade++;
        break;
  
        case 'RECLAIMED_BY_STUDENT':
        not_submit++;
        break;
      }
    }
    not_grade = submit - grade;
    return [submit, not_submit, grade, not_grade];
  }
  
  //期限遅れチェック
  function isLate(courseWork, submission : StudentSubmission) : boolean{
    if(courseWork.dueDate){
      const dueDay : Date = new Date(courseWork.dueDate["year"],courseWork.dueDate["month"] - 1,courseWork.dueDate["day"],23,59,59);
      const historys = submission.submissionHistory;
      if(historys){
        for(var history of historys){
          if(history?.stateHistory?.state == "TURNED_IN"){
            const turned : GoogleAppsScript.Classroom.Schema.StateHistory = history.stateHistory;
            const turnedDay : Date = new Date(turned.stateTimestamp ?? '2030-01-01');
            if(dueDay.getTime() < turnedDay.getTime()){
              return true;
            }
          }
        }
      }
    }
    return submission.late? true : false;
  }
  
  //検索ワードに一致ファイルを取得
  function getFileByExtension(submission : StudentSubmission, extensionRegExp : RegExp) : string | undefined{
    const attachments : GoogleAppsScript.Classroom.Schema.Attachment[] | undefined = submission?.assignmentSubmission?.attachments;
    if(attachments){
        for(const attachment of attachments){
            const file : GoogleAppsScript.Classroom.Schema.DriveFile | undefined = attachment.driveFile;
            if(file){
                if(file.title?.match(extensionRegExp)){
                    return file.alternateLink?.split('/')[5];
                }
            }
        }
    }
  }
  
  //生徒の課題に対するステータスを取得
  function getCourseWorkStatusList(courseId : string, courseWorkId : string) : StudentSubmission[]{
    let pageToken : any;
    let courseWorkStatusList : StudentSubmission[] = [];
    do{
      const response : GoogleAppsScript.Classroom.Schema.ListStudentSubmissionsResponse = Classroom.Courses!.CourseWork!.StudentSubmissions!.list(courseId,courseWorkId,{pageToken: pageToken});
      courseWorkStatusList = courseWorkStatusList.concat(response.studentSubmissions ?? []);
      pageToken = response.nextPageToken;
    }while(pageToken);  
    return courseWorkStatusList;
  }
  
  //クラスルームの全生徒を取得
  function getStudentList(courseId : string) : [string []] {
    let pageToken : any;
    let students : Student[] = [];
    do{
        const response : GoogleAppsScript.Classroom.Schema.ListStudentsResponse = Classroom.Courses!.Students!.list(courseId,{pageToken: pageToken});
        students = students.concat(response.students ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken); 

    const studentList : [string []] = [[]];
    students.forEach((student : Student) => {
      studentList.push([student?.profile?.emailAddress ?? '',student.profile?.name?.fullName ?? '',student.userId ?? '']);
    });
    //クラス_ナマエ順でソート
    studentList.sort((a, b) => {
    if (a[1] > b[1]) {
      return 1;
    } else {
      return -1;
    }
    });
    return studentList;
  }

  //課題一覧を取得
  function getCourseWorkList(courseId : string) : CourseWork[] {
    let pageToken : any;
    let courseWorkList : CourseWork[] = [];
    do{
        const response :  GoogleAppsScript.Classroom.Schema.ListCourseWorkResponse = Classroom.Courses!.CourseWork!.list(courseId, {pageToken: pageToken});
        courseWorkList = courseWorkList.concat(response.courseWork ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken);
    return courseWorkList;
  }
  
  //クラス一覧を取得
  function getCourseList() : Course[] {
    let pageToken : any;
    let courseList : Course[] = [];
    do{
        const response : GoogleAppsScript.Classroom.Schema.ListCoursesResponse = Classroom.Courses!.list({pageToken});
        courseList = courseList.concat(response.courses ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken);
    return courseList;
  }