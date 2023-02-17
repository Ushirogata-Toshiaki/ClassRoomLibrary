//各課題のステータスをまとめたオブジェクトを作成
  function courseWorkReslutList(courseId: string): CourseWorkResult[]{
    const courseWorkDataList: CourseWorkResult[] = [];
    const studentList: [string[]] = getStudentList(courseId);
    const courseWorkList: CourseWork[] = getCourseWorkList(courseId);
    if(courseWorkList == undefined){
      console.log('CourseWork is undifind');
    }
    courseWorkList.forEach((courseWork : CourseWork) =>{
      const coruseWorkResult: CourseWorkResult = {
        title: "",
        id: "",
        url: "",
        topic: "",
        due: undefined,
        maxPoint: 0,
        submitCount: {
          submit: 0,
          not_submit: 0,
          grade: 0,
          not_grade: 0
        },
        studentReslut: []
      };
      const submissionList: StudentSubmission[] = getStudentSubmisisonList(courseId, courseWork.id!);
      coruseWorkResult.title = courseWork.title!;
      coruseWorkResult.id = courseWork.id!;
      coruseWorkResult.url = courseWork.alternateLink!;
      coruseWorkResult.topic = Classroom.Courses!.Topics!.get(courseId,courseWork.topicId!).name ?? undefined;
      if(courseWork.dueDate != undefined){
        const dueDay: Date = new Date(courseWork.dueDate["year"]!,courseWork.dueDate["month"]! - 1,courseWork.dueDate["day"]!);
        dueDay.setHours(courseWork.dueTime?.hours ?? 23);
        dueDay.setMinutes(courseWork.dueTime?.minutes ?? 59);
        coruseWorkResult.due = dueDay;
      }
      coruseWorkResult.maxPoint = courseWork.maxPoints ?? undefined;
      coruseWorkResult['submitCount'] = getSubmitCount(submissionList);
      submissionList.forEach((submission: StudentSubmission) => {
      const student:string[][] = studentList.filter((row: string[]) =>{
        return row[2] == submission.userId;
       });
       let point = submission.assignedGrade;
       if(point == undefined){
        point = submission.draftGrade;
       }
       if(student.length > 0){
          coruseWorkResult['studentReslut'].push({
            'studentId': student[0][0],
            'name': student[0][1],
            'id': student[0][2],
            'point': point,
            'submissionInfo': checkLate(courseWork,submission)});
        }
      });
      courseWorkDataList.push(coruseWorkResult);
    });
    return courseWorkDataList;
  }
  
  //課題の提出、未提出を更新
  function getSubmitCount(submissionList: StudentSubmission[]): SubmitCount{
    const submitCount: SubmitCount = {
      'submit' : 0, //提出
      'not_submit' : 0, //未提出
      'grade' : 0,//採点済
      'not_grade' : 0, //未採点
    }
  
    for(const states of submissionList){
      switch(states.state){
        case 'NEW':
        submitCount.not_submit++;
        break;
  
        case 'CREATED':
        submitCount.not_submit++;
        break;
  
        case 'TURNED_IN':
        submitCount.submit++;
        break;
  
        case 'RETURNED':
        submitCount.submit++;
        submitCount.grade++;
        break;
  
        case 'RECLAIMED_BY_STUDENT':
        submitCount.not_submit++;
        break;
      }
    }
    submitCount.not_grade = submitCount.submit - submitCount.grade;
    return submitCount;
  }
  
  //期限遅れチェック
  function checkLate(courseWork: CourseWork, submission: StudentSubmission): SubmissiontInfo {
    const submissionInfo: SubmissiontInfo = {
      'submissionDate': undefined,
      'isLate': false
    };
    if(courseWork.dueDate){
      const dueDay: Date = new Date(courseWork.dueDate["year"]!,courseWork.dueDate["month"]! - 1,courseWork.dueDate["day"]!);
      dueDay.setHours(courseWork.dueTime?.hours ?? 23);
      dueDay.setMinutes(courseWork.dueTime?.minutes ?? 59);
      const historys: GoogleAppsScript.Classroom.Schema.SubmissionHistory[] | undefined = submission.submissionHistory;
      if(historys){
        for(var history of historys){
          if(history.stateHistory?.state == "TURNED_IN"){
            const turnedDay: Date = new Date(history.stateHistory.stateTimestamp!);
            submissionInfo.submissionDate = turnedDay;
            if(dueDay.getTime() < turnedDay.getTime()){
              submissionInfo.isLate = true;
              return submissionInfo;
            }
          }
        }
      }
    }
    submissionInfo.isLate = submission.late? true : false;
    return submissionInfo;
  }
  
  //検索ワードに一致ファイルを取得
  function getFileByExtension(submission: StudentSubmission, extensionRegExp: RegExp): string | undefined{
    const attachments: GoogleAppsScript.Classroom.Schema.Attachment[] | undefined = submission?.assignmentSubmission?.attachments;
    if(attachments){
      for(const attachment of attachments){
          const file: GoogleAppsScript.Classroom.Schema.DriveFile | undefined = attachment.driveFile;
          if(file){
              if(file.title?.match(extensionRegExp)){
                console.log(file.title);
                return file.alternateLink;
              }
          }
      }
    }
    console.log('file not found');
  }
  
  //生徒の課題に対するステータスを取得
  function getStudentSubmisisonList(courseId: string, courseWorkId: string): StudentSubmission[]{
    let pageToken: any;
    let courseWorkStatusList: StudentSubmission[] = [];
    do{
      const response: GoogleAppsScript.Classroom.Schema.ListStudentSubmissionsResponse = Classroom.Courses!.CourseWork!.StudentSubmissions!.list(courseId,courseWorkId,{pageToken: pageToken});
      courseWorkStatusList = courseWorkStatusList.concat(response.studentSubmissions ?? []);
      pageToken = response.nextPageToken;
    }while(pageToken);  
    return courseWorkStatusList;
  }
  
  //クラスルームの全生徒を取得
  function getStudentList(courseId : string): [string []] {
    let pageToken: any;
    let students: Student[] = [];
    do{
        const response: GoogleAppsScript.Classroom.Schema.ListStudentsResponse = Classroom.Courses!.Students!.list(courseId,{pageToken: pageToken});
        students = students.concat(response.students ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken); 

    const studentList: [string []] = [[]];
    students.forEach((student: Student) => {
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
  function getCourseWorkList(courseId: string): CourseWork[] {
    let pageToken: any;
    let courseWorkList: CourseWork[] = [];
    do{
        const response: GoogleAppsScript.Classroom.Schema.ListCourseWorkResponse = Classroom.Courses!.CourseWork!.list(courseId, {pageToken: pageToken});
        courseWorkList = courseWorkList.concat(response.courseWork ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken);
    return courseWorkList;
  }
  
  //クラス一覧を取得
  function getCourseList(): Course[] {
    let pageToken: any;
    let courseList: Course[] = [];
    do{
        const response: GoogleAppsScript.Classroom.Schema.ListCoursesResponse = Classroom.Courses!.list({pageToken});
        courseList = courseList.concat(response.courses ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken);
    return courseList;
  }