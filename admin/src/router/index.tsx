import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthRoute from '../components/AuthRoute';
import BasicLayout from '../layouts/BasicLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Courses from '../pages/Courses';
import Teachers from '../pages/Teachers';
import Venues from '../pages/Venues';
import Schedules from '../pages/Schedules';
import Orders from '../pages/Orders';
import SystemConfig from '../pages/SystemConfig';
import CourseCategory from '../pages/CourseCategory';
import CourseForm from '../pages/Courses/CourseForm';
import TeacherDetail from '../pages/Teachers/TeacherDetail';
import VenueDetail from '../pages/Venues/VenueDetail';
import ClassGroups from '../pages/ClassGroups';
import ClassGroupDetail from '../pages/ClassGroups/ClassGroupDetail';
import Reviews from '../pages/Reviews';
import TeacherApplications from '../pages/TeacherApplications';
import ApplicationDetail from '../pages/TeacherApplications/ApplicationDetail';
import VenueApplications from '../pages/VenueApplications';
import VenueApplicationDetail from '../pages/VenueApplications/ApplicationDetail';
import Students from '../pages/Students';
import StudentDetail from '../pages/Students/StudentDetail';
import Notes from '../pages/Notes';
import Checkins from '../pages/Checkins';
import TrialBookings from '../pages/TrialBookings';
import TrialBookingDetail from '../pages/TrialBookings/TrialBookingDetail';
import Feedbacks from '../pages/Feedbacks';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AuthRoute />,
    children: [
      {
        element: <BasicLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'courses', element: <Courses /> },
          { path: 'courses/create', element: <CourseForm /> },
          { path: 'courses/edit/:id', element: <CourseForm /> },
          { path: 'course-categories', element: <CourseCategory /> },
          { path: 'teachers', element: <Teachers /> },
          { path: 'teachers/:id', element: <TeacherDetail /> },
          { path: 'venues', element: <Venues /> },
          { path: 'venues/:id', element: <VenueDetail /> },
          { path: 'schedules', element: <Schedules /> },
          { path: 'class-groups', element: <ClassGroups /> },
          { path: 'class-groups/:id', element: <ClassGroupDetail /> },
          { path: 'teacher-applications', element: <TeacherApplications /> },
          { path: 'teacher-applications/:id', element: <ApplicationDetail /> },
          { path: 'venue-applications', element: <VenueApplications /> },
          { path: 'venue-applications/:id', element: <VenueApplicationDetail /> },
          { path: 'orders', element: <Orders /> },
          { path: 'reviews', element: <Reviews /> },
          { path: 'students', element: <Students /> },
          { path: 'students/:id', element: <StudentDetail /> },
          { path: 'notes', element: <Notes /> },
          { path: 'checkins', element: <Checkins /> },
          { path: 'trial-bookings', element: <TrialBookings /> },
          { path: 'trial-bookings/:id', element: <TrialBookingDetail /> },
          { path: 'feedbacks', element: <Feedbacks /> },
          { path: 'system-config', element: <SystemConfig /> },
        ],
      },
    ],
  },
]);

export default router;
