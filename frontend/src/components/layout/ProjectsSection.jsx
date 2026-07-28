// components/ProjectsSection.jsx
// Danh sách các project đang tuyển Expert

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";



// ─── Component con: 1 dòng project ───────────────────
function ProjectCard({ job, onProjectClick }) {

  const formatVND = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value * 26000);


  return (

    <div
      onClick={onProjectClick}
      className="
      group
      relative
      rounded-2xl
      border
      border-white/10
      bg-white/[0.03]
      p-5
      transition
      hover:border-cyan-400/30
      hover:bg-white/[0.05]
      hover:-translate-y-0.5
      "
    >


      {/* Complexity badge */}

      <span
        className="
        absolute
        top-4
        right-4
        px-2.5
        py-1
        rounded-full
        bg-violet-400/10
        border
        border-violet-400/25
        text-violet-300
        text-[10px]
        font-mono
        font-bold
        uppercase
        "
      >
        {job.complexity}
      </span>



      {/* Title */}

      <div className="pr-20 mb-3">

        <h3
          className="
          text-white
          font-bold
          text-[16px]
          leading-snug
          group-hover:text-cyan-400
          transition
          "
        >
          {job.title}
        </h3>


        <p
          className="
          text-cyan-300/80
          text-xs
          font-mono
          mt-1
          "
        >
          {job.projectType}
        </p>

      </div>



      {/* Description */}

      <p
        className="
        text-gray-400
        text-[13px]
        leading-relaxed
        mb-4
        line-clamp-3
        "
      >
        {job.description}
      </p>



      {/* Budget */}

      <div
        className="
        flex
        items-center
        gap-2
        mb-4
        "
      >

        <span
          className="
          material-symbols-outlined
          text-yellow-400
          "
        >
          payments
        </span>


        <span
          className="
          text-yellow-400
          font-semibold
          text-sm
          "
        >
          {formatVND(job.budgetMin)}
          {" - "}
          {formatVND(job.budgetMax)}
        </span>

      </div>



      {/* Skills */}

      <div className="flex flex-wrap gap-1.5">

        {job.skills?.slice(0,4).map((skill)=>(

          <span
            key={skill.skillId}
            className="
            px-2.5
            py-1
            rounded-full
            bg-cyan-400/10
            border
            border-cyan-400/20
            text-cyan-300
            text-[11px]
            font-mono
            "
          >
            {skill.skillName}
          </span>

        ))}


        {job.skills?.length > 4 && (

          <span
            className="
            px-2.5
            py-1
            rounded-full
            bg-white/5
            border
            border-white/10
            text-gray-400
            text-[11px]
            font-mono
            "
          >
            +{job.skills.length - 4}
          </span>

        )}

      </div>



      {/* Hover */}

      <button
        type="button"
        onClick={onProjectClick}
        className="
          mt-5
          w-full
          flex
          items-center
          justify-between
          text-left
        "
      >

        <span
          className="
            flex
            items-center
            gap-1.5
            text-cyan-400
            text-xs
            font-semibold
            opacity-0
            group-hover:opacity-100
            transition-all
          "
        >

          View project

          <span
            className="
              material-symbols-outlined
              text-sm
              transition-transform
              group-hover:translate-x-1
            "
          >
            arrow_forward
          </span>

        </span>


        <span
          className="
            text-gray-500
            text-xs
            group-hover:text-cyan-400
            transition
          "
        >
          Open
        </span>


      </button>


    </div>

  );
}

// ─── Component cha ────────────────────────────────────
export default function ProjectsSection() {

  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const fetchJobs = async () => {

      try {

        const res = await axiosInstance.get("/jobs/open");

        const list = Array.isArray(res.data)
          ? res.data
          : [];


        // lấy job giá trị cao nhất
        const sorted = list
          .sort(
            (a, b) =>
              (b.budgetMax ?? 0) -
              (a.budgetMax ?? 0)
          )
          .slice(0, 6);


        setJobs(sorted);


      } catch (error) {

        console.error(
          "Load jobs failed:",
          error
        );

      } finally {

        setLoading(false);

      }

    };


    fetchJobs();

  }, []);



  return (
    <section className="px-4 md:px-12 py-24 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              High-Value AI Projects
            </h2>
            <p className="text-gray-400">
              Active listings from global tech leaders and innovative startups.
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="
              group
              flex
              items-center
              gap-2
              px-5
              py-2.5
              rounded-xl
              border
              border-cyan-400/30
              bg-cyan-400/10
              text-cyan-300
              font-semibold
              text-sm
              transition-all
              hover:bg-cyan-400
              hover:text-gray-900
              hover:border-cyan-400
            "
          >

            View all listings

            <span
              className="
                material-symbols-outlined
                text-lg
                transition-transform
                group-hover:translate-x-1
              "
            >
              arrow_forward
            </span>

          </button>
        </div>

        {/* Danh sách project — space-y-4: khoảng cách dọc giữa các card */}
        <div className="space-y-4">
          {loading ? (

          <p className="text-gray-400">
            Loading projects...
          </p>

        ) : (

        jobs.map((job)=>(

          <ProjectCard
            key={job.jobPostingId}
            job={job}
            onProjectClick={() => navigate("/login")}
            />

        ))

        )}
        </div>

      </div>
    </section>
  );
}