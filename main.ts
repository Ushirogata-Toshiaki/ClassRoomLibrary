type Course = GoogleAppsScript.Classroom.Schema.Course;
type CourseWork = GoogleAppsScript.Classroom.Schema.CourseWork;
type StudentSubmission = GoogleAppsScript.Classroom.Schema.StudentSubmission;
type Student = GoogleAppsScript.Classroom.Schema.Student;

function update(courseId, property){
    const course = Classroom.Courses.get(courseId);
    const studentlist = getStudentList(courseId);
    const courseWorkList = getCourseWorkList(courseId);
    const workList = {};
    const statesList = {};
    const studentDictionary = {};
    const students = [];
    for(const student of studentlist){
      const address = student.profile.emailAddress.split('@')[0];
      studentDictionary[student.userId] = address;
      students.push([address,student.profile.name.fullName]);
      statesList[address] = {};
    }
  
    const courseDictionary = {
      'id' : course.alternateLink.split('/')[4] //URLのID部分を取得
    };
  
    let workNumber = 0;
    for(const work of courseWorkList){
      const courseWorkStatusList = getCourseWorkStatusList(courseId, work.id); //課題データを取得
      courseDictionary[work.title] = workNumber; //課題名と番号を紐づけ
  
      //各情報を取得
      let dueDate = work.dueDate;
      if(dueDate){
        dueDate = Utilities.formatDate(new Date(dueDate.year,dueDate.month,dueDate.day), 'JST', 'yyyy-MM-dd');
      }
      let topic = Classroom.Courses.Topics.get(courseId,work.topicId);
      if(topic){
        topic = topic.name;
      }
      const submissionCount = countSubmission(courseWorkStatusList); //提出数,採点数をカウント
      workList[workNumber.toString()] = {
        'link' : work.alternateLink.split('/')[6],
        'topic' : topic,
        'point' : work.maxPoints,
        'due' : dueDate,
        'sub' : submissionCount.submission,
        'nsub' : submissionCount.not_submission,
        'grade' : submissionCount.grade,
        'ngrade' : submissionCount.not_grade
      };
  
      for(const states of courseWorkStatusList){
        let submission = 0;
        let grade = 0;
        if(states.state == 'RETURNED'){
          submission = 1;
          grade = 1;
        }
        if(states.state == 'TURNED_IN'){
          submission = 1;
        }
        const isLate = checkLate(work, states);
        const file = getFileByExtension(states);
        statesList[studentDictionary[states.userId]][workNumber.toString()]= {
          'point' : states.assignedGrade,
          'sub' : submission,
          'grade' : grade,
          'due' : isLate,
          'plus' : file
        };
      }
      workNumber++;
    }
  }
  
  //課題の提出、未提出を更新
  function countSubmission(courseWorkStatusList){
    const counts = {
     'submission' : 0,
     'not_submission' : 0,
     'grade' : 0,
     'not_grade' : 0
    };
  
    for(const states of courseWorkStatusList){
      switch(states.state){
        case 'NEW':
        counts.not_submission++;
        break;
  
        case 'CREATED':
        counts.not_submission;
        break;
  
        case 'TURNED_IN':
        counts.submission++;
        break;
  
        case 'RETURNED':
        counts.submission++;
        counts.grade++;
        break;
  
        case 'RECLAIMED_BY_STUDENT':
        counts.not_submission++;
        break;
      }
    }
    counts.not_grade = counts.submission - counts.grade;
    return counts;
  }
  
  //期限内の提出かをチェック
  function isLate(courseWork, submission : StudentSubmission) : boolean{
    if(courseWork.dueDate){
      const dueDay : Date = new Date(courseWork.dueDate["year"],courseWork.dueDate["month"] - 1,courseWork.dueDate["day"],23,59,59);
      let turned : GoogleAppsScript.Classroom.Schema.StateHistory | undefined = undefined;
      const historys = submission.submissionHistory;
      if(historys){
        for(var history of historys){
          if(history.stateHistory){
            if(history.stateHistory.state == "TURNED_IN"){
              turned = history.stateHistory;
            }
          }
        }
        if(turned != undefined){     
          const turnedDay = new Date(turned.stateTimestamp ?? '2030-01-01');
          if(dueDay.getTime() < turnedDay.getTime()){
            return true;
          }
        }
      }
    }
    return submission.late;
  }
  
  //mdファイルを取得
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
  function getStudentList(courseId : string) : Student[] {
    let pageToken : any;
    let studentList : Student[] = [];
    do{
        const response : GoogleAppsScript.Classroom.Schema.ListStudentsResponse = Classroom.Courses!.Students!.list(courseId,{pageToken: pageToken});
        studentList = studentList.concat(response.students ?? []);
        pageToken = response.nextPageToken;
    }while(pageToken); 
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